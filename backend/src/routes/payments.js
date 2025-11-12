const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')
const { recalcRentBillPaidStatus } = require('../lib/rentBill.recalc')
const { recalcWaterBillPaidStatus } = require('../lib/recalcWaterBillPaidStatus')
const { applyPayment } = require('../lib/applyPayments') // central allocator

const prisma = new PrismaClient()
const paymentsRouter = Router()

// List payments (now supports filtering by tenant)
paymentsRouter.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1)
    const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100)
    const skip = (page - 1) * pageSize

    const rentBillId = req.query.rentBillId ? Number(req.query.rentBillId) : undefined
    const waterBillId = req.query.waterBillId ? Number(req.query.waterBillId) : undefined
    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined
    const from = req.query.from ? new Date(String(req.query.from)) : undefined
    const to = req.query.to ? new Date(String(req.query.to)) : undefined

    const where = {}
    if (rentBillId) where.rentBillId = rentBillId
    if (waterBillId) where.waterBillId = waterBillId
    if (tenantId) where.tenantId = tenantId
    if (from || to) where.paidAt = { gte: from, lte: to }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          tenant: true,
          rentBill: {
            include: {
              lease: {
                include: {
                  tenant: true,
                  unit: true
                }
              }
            }
          },
          waterBill: true
        }
      }),
      prisma.payment.count({ where })
    ])

    const result = items.map(p => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt,
      method: p.method,
      reference: p.reference,
      note: p.note,
      tenant: p.tenant
        ? { id: p.tenant.id, name: p.tenant.name, email: p.tenant.email, phone: p.tenant.phone }
        : null,
      rentBill: p.rentBill
        ? {
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
        : null,
      waterBill: p.waterBill
        ? {
            id: p.waterBill.id,
            billingDate: p.waterBill.billingDate ?? null,
            amount: p.waterBill.amount,
            paid: p.waterBill.paid
          }
        : null
    }))

    res.json({ page, pageSize, total, items: result })
  } catch (e) {
    console.error('Error listing payments:', e)
    res.status(500).json({ error: e.message })
  }
})

// Get one payment
paymentsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        tenant: true,
        rentBill: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: true
              }
            }
          }
        },
        waterBill: true
      }
    })

    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    res.json(payment)
  } catch (e) {
    console.error('Error fetching payment:', e)
    res.status(500).json({ error: e.message })
  }
})

// Create payment (tenantId now required)
// If rentBillId or waterBillId provided: assign directly and recalc that bill.
// Otherwise call applyPayment() to auto-allocate across unpaid bills.
paymentsRouter.post('/', async (req, res) => {
  try {
    const { tenantId, rentBillId, waterBillId, amount, paidAt, method, reference, note } = req.body

    if (!tenantId || !amount) {
      return res.status(400).json({ error: 'tenantId and amount are required' })
    }

    // Direct assignment to a specific rent bill
    if (rentBillId || waterBillId) {
      // Optional validation for provided bill
      if (rentBillId) {
        const found = await prisma.rentBill.findUnique({ where: { id: Number(rentBillId) } })
        if (!found) return res.status(400).json({ error: 'Invalid rentBillId' })
      }
      if (waterBillId) {
        const foundW = await prisma.waterBill.findUnique({ where: { id: Number(waterBillId) } })
        if (!foundW) return res.status(400).json({ error: 'Invalid waterBillId' })
      }

      const payment = await prisma.payment.create({
        data: {
          tenantId: Number(tenantId),
          rentBillId: rentBillId ? Number(rentBillId) : null,
          waterBillId: waterBillId ? Number(waterBillId) : null,
          amount: Number(amount),
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          method,
          reference,
          note
        },
        include: {
          tenant: true,
          rentBill: {
            include: {
              lease: {
                include: { tenant: true, unit: true }
              }
            }
          },
          waterBill: true
        }
      })

      // Recalculate affected bill(s)
      let summary = null
      if (rentBillId) summary = await recalcRentBillPaidStatus(Number(rentBillId))
      if (waterBillId) {
        try {
          await recalcWaterBillPaidStatus(Number(waterBillId))
        } catch (err) {
          // log but don't fail the response
          console.warn('water bill recalc failed:', err.message)
        }
      }

      return res.status(201).json({ payment, summary })
    }

    // Otherwise: tenant-wide lump-sum -> use centralized allocator
    const result = await applyPayment({
      tenantId: Number(tenantId),
      amount: Number(amount),
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      method,
      reference,
      note
    })

    res.status(201).json({ ok: true, ...result })
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
      select: { rentBillId: true, waterBillId: true }
    })
    if (!existing) return res.status(404).json({ error: 'Payment not found' })

    const { tenantId, rentBillId, waterBillId, amount, paidAt, method, reference, note } = req.body
    const updateData = {}
    if (tenantId !== undefined) updateData.tenantId = Number(tenantId)
    if (rentBillId !== undefined) updateData.rentBillId = rentBillId ? Number(rentBillId) : null
    if (waterBillId !== undefined) updateData.waterBillId = waterBillId ? Number(waterBillId) : null
    if (amount !== undefined) updateData.amount = Number(amount)
    if (paidAt !== undefined) updateData.paidAt = new Date(paidAt)
    if (method !== undefined) updateData.method = method
    if (reference !== undefined) updateData.reference = reference
    if (note !== undefined) updateData.note = note

    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        tenant: true,
        rentBill: {
          include: {
            lease: {
              include: {
                tenant: true,
                unit: true
              }
            }
          }
        },
        waterBill: true
      }
    })

    // Recalculate affected bills if association exists
    let summary = null
    if (payment.rentBillId) summary = await recalcRentBillPaidStatus(payment.rentBillId)
    if (payment.waterBillId) {
      try {
        await recalcWaterBillPaidStatus(payment.waterBillId)
      } catch (err) {
        console.warn('water bill recalc failed on update:', err.message)
      }
    }

    res.json({ payment, summary })
  } catch (e) {
    console.error('Payment update error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Delete payment
paymentsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { rentBillId: true, waterBillId: true }
    })
    if (!existing) return res.status(404).json({ error: 'Payment not found' })

    await prisma.payment.delete({ where: { id } })

    let summary = null
    if (existing.rentBillId) summary = await recalcRentBillPaidStatus(existing.rentBillId)
    if (existing.waterBillId) {
      try {
        await recalcWaterBillPaidStatus(existing.waterBillId)
      } catch (err) {
        console.warn('water bill recalc failed on delete:', err.message)
      }
    }

    res.json({ ok: true, summary })
  } catch (e) {
    console.error('Payment delete error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Get summary for a specific bill
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
        lease: bill.lease
          ? {
              id: bill.lease.id,
              monthlyRent: bill.lease.monthlyRent,
              startDate: bill.lease.startDate,
              endDate: bill.lease.endDate,
              tenant: bill.lease.tenant,
              unit: bill.lease.unit
            }
          : null
      },
      totals: {
        totalPaid,
        balance,
        fullyPaid: totalPaid >= bill.amount
      }
    })
  } catch (e) {
    console.error('Summary fetch error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = paymentsRouter
