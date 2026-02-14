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

    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined
    const rentBillId = req.query.rentBillId ? Number(req.query.rentBillId) : undefined
    const waterBillId = req.query.waterBillId ? Number(req.query.waterBillId) : undefined
    const from = req.query.from ? new Date(req.query.from) : undefined
    const to = req.query.to ? new Date(req.query.to) : undefined

    // Base payment filter
    const paymentWhere = {}
    if (tenantId) paymentWhere.tenantId = tenantId
    if (from || to) {
      paymentWhere.paidAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {})
      }
    }

    // Build allocation filter (optional)
    const allocationConditions = []

    if (rentBillId) {
      allocationConditions.push({ billType: 'rent', billId: rentBillId })
    }

    if (waterBillId) {
      allocationConditions.push({ billType: 'water', billId: waterBillId })
    }

    if (allocationConditions.length) {
      paymentWhere.allocations = {
        some: {
          OR: allocationConditions
        }
      }
    }


    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { paidAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          tenant: true,
          allocations: {
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
              },
              waterBill: true
            }
          }
        }
      }),
      prisma.payment.count({ where: paymentWhere })
    ])

    // Shape response for frontend
    const result = items.map(p => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt,
      method: p.method,
      reference: p.reference,
      note: p.note,
      tenant: p.tenant
        ? {
            id: p.tenant.id,
            name: p.tenant.name,
            email: p.tenant.email,
            phone: p.tenant.phone
          }
        : null,
      allocations: p.allocations.map(a => ({
        id: a.id,
        billType: a.billType,
        billId: a.billId,
        amount: a.amount,
        rentBill: a.billType === 'rent' && a.rentBill
          ? {
              id: a.rentBill.id,
              dueDate: a.rentBill.dueDate,
              amount: a.rentBill.amount,
              paid: a.rentBill.paid,
              lease: a.rentBill.lease
                ? {
                    id: a.rentBill.lease.id,
                    monthlyRent: a.rentBill.lease.monthlyRent,
                    startDate: a.rentBill.lease.startDate,
                    endDate: a.rentBill.lease.endDate,
                    tenant: a.rentBill.lease.tenant,
                    unit: a.rentBill.lease.unit
                  }
                : null
            }
          : null,
        waterBill: a.billType === 'water' && a.waterBill
          ? {
              id: a.waterBill.id,
              dueDate: a.waterBill.dueDate,
              amount: a.waterBill.amount,
              status: a.waterBill.status
            }
          : null
      }))
    }))

    res.json({
      page,
      pageSize,
      total,
      items: result
    })
  } catch (e) {
    console.error('Error listing payments:', e)
    res.status(500).json({ error: e.message })
  }
})

// Get one payment (allocation-aware)
paymentsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        tenant: true,
        allocations: {
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
            },
            waterBill: true
          }
        }
      }
    })

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    const result = {
      id: payment.id,
      amount: payment.amount,
      paidAt: payment.paidAt,
      method: payment.method,
      reference: payment.reference,
      note: payment.note,
      tenant: payment.tenant
        ? {
            id: payment.tenant.id,
            name: payment.tenant.name,
            email: payment.tenant.email,
            phone: payment.tenant.phone
          }
        : null,
      allocations: payment.allocations.map(a => ({
        id: a.id,
        billType: a.billType,
        billId: a.billId,
        amount: a.amount,
        rentBill: a.billType === 'rent' && a.rentBill
          ? {
              id: a.rentBill.id,
              dueDate: a.rentBill.dueDate,
              amount: a.rentBill.amount,
              paid: a.rentBill.paid,
              lease: a.rentBill.lease
                ? {
                    id: a.rentBill.lease.id,
                    monthlyRent: a.rentBill.lease.monthlyRent,
                    startDate: a.rentBill.lease.startDate,
                    endDate: a.rentBill.lease.endDate,
                    tenant: a.rentBill.lease.tenant,
                    unit: a.rentBill.lease.unit
                  }
                : null
            }
          : null,
        waterBill: a.billType === 'water' && a.waterBill
          ? {
              id: a.waterBill.id,
              dueDate: a.waterBill.dueDate,
              amount: a.waterBill.amount,
              status: a.waterBill.status
            }
          : null
      }))
    }

    res.json(result)
  } catch (e) {
    console.error('Error fetching payment:', e)
    res.status(500).json({ error: e.message })
  }
})

// Create payment (tenantId now required)
paymentsRouter.post('/', async (req, res) => {
  try {
    const { tenantId, amount, paidAt, method, reference, note } = req.body

    if (!tenantId || !amount) {
      return res.status(400).json({ error: 'tenantId and amount are required' })
    }

    const result = await prisma.$transaction(async (tx) => {
      return applyPayment(
        {
          tenantId: Number(tenantId),
          amount: Number(amount),
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          method,
          reference,
          note
        },
        tx
      )
    })

    res.status(201).json(result)
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
      where: { id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    const { paidAt, method, reference, note } = req.body

    const updateData = {}
    if (paidAt !== undefined) updateData.paidAt = new Date(paidAt)
    if (method !== undefined) updateData.method = method
    if (reference !== undefined) updateData.reference = reference
    if (note !== undefined) updateData.note = note

    const payment = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        tenant: true,
        allocations: true
      }
    })

    res.json({ payment })
  } catch (e) {
    console.error('Payment update error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Delete payment
paymentsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: {
          allocations: true
        }
      })

      if (!payment) {
        throw new Error('NOT_FOUND')
      }

      // Capture affected bills before deletion
      const affectedRentBills = payment.allocations
        .filter(a => a.billType === 'rent')
        .map(a => a.billId)

      const affectedWaterBills = payment.allocations
        .filter(a => a.billType === 'water')
        .map(a => a.billId)

      // Delete allocations first
      await tx.paymentAllocation.deleteMany({
        where: { paymentId: id }
      })

      // Delete payment
      await tx.payment.delete({
        where: { id }
      })

      // Recalculate affected bills
      for (const billId of affectedRentBills) {
        await recalcRentBillPaidStatus(billId, tx)
      }

      for (const billId of affectedWaterBills) {
        await recalcWaterBillPaidStatus(billId, tx)
      }

      return {
        deletedPaymentId: id,
        affectedRentBills,
        affectedWaterBills
      }
    })

    res.json({ ok: true, ...result })
  } catch (e) {
    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Payment not found' })
    }

    console.error('Payment delete error:', e)
    res.status(500).json({ error: e.message })
  }
})


// Get summary for a specific bill
// Get summary for a specific rent bill (allocation-driven)
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

    if (!bill) {
      return res.status(404).json({ error: 'RentBill not found' })
    }

    const agg = await prisma.paymentAllocation.aggregate({
      where: {
        billType: 'rent',
        billId: rentBillId
      },
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
