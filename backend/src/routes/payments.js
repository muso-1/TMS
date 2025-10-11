const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')
const { recalcRentBillPaidStatus } = require('../lib/rentBill.recalc')


const prisma = new PrismaClient()
const paymentsRouter = Router()


// List payments (now includes bill -> lease -> tenant/unit context)
paymentsRouter.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1)
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100)
    const skip = (page - 1) * pageSize

    const rentBillId = req.query.rentBillId ? Number(req.query.rentBillId) : undefined
    const from = req.query.from ? new Date(String(req.query.from)) : undefined
    const to = req.query.to ? new Date(String(req.query.to)) : undefined

    const where = {}
    if (rentBillId) where.rentBillId = rentBillId
    if (from || to) where.paidAt = { gte: from, lte: to }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          rentBill: {
            include: {
              lease: {
                include: {
                  tenant: true,
                  unit: true
                }
              }
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ])

    // Optional: Format the output for frontend
    const result = items.map(p => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt,
      method: p.method,
      reference: p.reference,
      note: p.note,
      rentBill: {
        id: p.rentBill.id,
        dueDate: p.rentBill.dueDate,
        amount: p.rentBill.amount,
        paid: p.rentBill.paid,
        lease: p.rentBill.lease
          ? {
              id: p.rentBill.lease.id,
              monthlyRent: p.rentBill.lease.monthlyRent,
              startDate: p.rentBill.lease.startDate,
              endDate: p.rentBill.lease.endDate,
              tenant: p.rentBill.lease.tenant,
              unit: p.rentBill.lease.unit
            }
          : null
      }
    }))

    res.json({ page, pageSize, total, items: result })
  } catch (e) {
    console.error('Error listing payments:', e)
    res.status(500).json({ error: e.message })
  }
})


// Get one payment (with context)
paymentsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        rentBill: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: true
              }
            }
          }
        }
      }
    })

    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    res.json(payment)
  } catch (e) {
    console.error('Error fetching payment:', e)
    res.status(500).json({ error: e.message })
  }
})

// Create a payment
paymentsRouter.post('/', async (req, res) => {
  try {
    const { rentBillId, amount, paidAt, method, reference, note } = req.body
    if (!rentBillId || !amount) {
      return res.status(400).json({ error: 'rentBillId and amount are required' })
    }

    const bill = await prisma.rentBill.findUnique({
      where: { id: Number(rentBillId) },
      include: {
        lease: {
          include: { tenant: true, unit: true }
        }
      }
    })

    if (!bill) {
      return res.status(400).json({ error: 'Invalid rentBillId' })
    }

    const payment = await prisma.payment.create({
      data: {
        rentBillId: Number(rentBillId),
        amount: Number(amount),
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        method,
        reference,
        note
      },
      include: {
        rentBill: {
          include: {
            lease: {
              include: { tenant: true, unit: true }
            }
          }
        }
      }
    })

    res.status(201).json(payment)
  } catch (e) {
    console.error('Error creating payment:', e)
    res.status(500).json({ error: e.message })
  }
})


// Update payment
paymentsRouter.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { rentBillId: true }
    })
    if (!existing) return res.status(404).json({ error: 'Payment not found' })

    // destructure body
    const { rentBillId, amount, paidAt, method, reference, note } = req.body

    // build updateData safely
    const updateData = {}
    if (rentBillId !== undefined) updateData.rentBillId = Number(rentBillId)
    if (amount !== undefined) updateData.amount = Number(amount)
    if (paidAt !== undefined) updateData.paidAt = new Date(paidAt)
    if (method !== undefined) updateData.method = method
    if (reference !== undefined) updateData.reference = reference
    if (note !== undefined) updateData.note = note

    // Update payment and include nested info
    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        rentBill: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: true
              }
            }
          }
        }
      }
    })

    // Recalculate rent bill status
    const summary = await recalcRentBillPaidStatus(payment.rentBillId)

    res.json({ payment, summary })
  } catch (e) {
    console.error("Payment update error:", e)
    res.status(500).json({ error: e.message })
  }
})

// Delete payment
paymentsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { rentBillId: true }
    })
    if (!existing) return res.status(404).json({ error: 'Payment not found' })

    await prisma.payment.delete({ where: { id } })

    // Recalculate rent bill status after deletion
    const summary = await recalcRentBillPaidStatus(existing.rentBillId)

    res.json({ ok: true, summary })
  } catch (e) {
    console.error("Payment delete error:", e)
    res.status(500).json({ error: e.message })
  }
})

// Get summary for a specific bill (with lease/tenant/unit)
paymentsRouter.get('/bill/:rentBillId/summary', async (req, res) => {
  try {
    const rentBillId = Number(req.params.rentBillId)

    const bill = await prisma.rentBill.findUnique({
      where: { id: rentBillId },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true
          }
        }
      }
    })

    if (!bill) return res.status(404).json({ error: 'RentBill not found' })

    const agg = await prisma.payment.aggregate({
      where: { rentBillId },
      _sum: { amount: true }
    })

    const totalPaid = agg._sum.amount ?? 0
    const balance = bill.amount - totalPaid

    res.json({
      bill: {
        id: bill.id,
        amount: bill.amount,
        dueDate: bill.dueDate,
        paid: bill.paid,
        lease: bill.lease ? {
          id: bill.lease.id,
          monthlyRent: bill.lease.monthlyRent,
          startDate: bill.lease.startDate,
          endDate: bill.lease.endDate,
          tenant: bill.lease.tenant,
          unit: bill.lease.unit
        } : null
      },
      totals: {
        totalPaid,
        balance,
        fullyPaid: totalPaid >= bill.amount
      }
    })
  } catch (e) {
    console.error("Summary fetch error:", e)
    res.status(500).json({ error: e.message })
  }
})


module.exports = paymentsRouter
