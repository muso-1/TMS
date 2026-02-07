const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')
const { createRentBillWithCredit } = require('../services/rentBillService')

const prisma = new PrismaClient()
const rentBillsRouter = Router()

async function buildRentBillResponse(bill) {
  const agg = await prisma.paymentAllocation.aggregate({
    where: {
      billType: 'rent',
      rentBillId: bill.id
    },
    _sum: { amount: true }
  })

  const totalPaid = agg._sum.amount ?? 0

  return {
    id: bill.id,
    amount: bill.amount,
    dueDate: bill.dueDate,
    paid: totalPaid >= bill.amount,
    totalPaid,
    balance: bill.amount - totalPaid,
    reminderSent: bill.reminderSent,
    reminderSentAt: bill.reminderSentAt,
    lease: bill.lease && {
      id: bill.lease.id,
      monthlyRent: bill.lease.monthlyRent,
      startDate: bill.lease.startDate,
      endDate: bill.lease.endDate,
      tenant: bill.lease.tenant,
      unit: bill.lease.unit
    }
  }
}

/**
 * Helper: compute financials for a rent bill
 */
async function computeRentBillTotals(billId) {
  const agg = await prisma.paymentAllocation.aggregate({
    where: {
      billType: 'rent',
      rentBillId: billId
    },
    _sum: { amount: true }
  })

  const totalPaid = agg._sum.amount ?? 0
  return totalPaid
}

/**
 * List all rent bills (read-only, allocation-derived)
 */
rentBillsRouter.get('/', async (req, res) => {
  try {
    const bills = await prisma.rentBill.findMany({
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    })

    const results = await Promise.all(
      bills.map(buildRentBillResponse)
    )

    res.json(results)
  } catch (e) {
    console.error('Error fetching rent bills:', e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * Get single rent bill summary
 */
rentBillsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const bill = await prisma.rentBill.findUnique({
      where: { id },
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
      return res.status(404).json({ error: 'Rent bill not found' })
    }

    res.json(await buildRentBillResponse(bill))
  } catch (e) {
    console.error('Error fetching rent bill:', e)
    res.status(500).json({ error: e.message })
  }
})


/**
 * Create rent bill
 */
rentBillsRouter.post('/', async (req, res) => {
  try {
    const { leaseId, dueDate } = req.body

    if (!leaseId || !dueDate) {
      return res.status(400).json({ error: 'leaseId and dueDate are required' })
    }

    const lease = await prisma.lease.findUnique({
      where: { id: Number(leaseId) },
      include: {
        tenant: true,
        unit: true
      }
    })

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' })
    }

    const bill = await prisma.$transaction(async (tx) => {
      return createRentBillWithCredit({
        tx,
        lease,
        amount: lease.monthlyRent,
        dueDate: new Date(dueDate)
      })
    })

    // Reload with relations for response
    const fullBill = await prisma.rentBill.findUnique({
      where: { id: bill.id },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true
          }
        }
      }
    })

    const response = await buildRentBillResponse(fullBill)
    res.status(201).json(response)

  } catch (e) {
    console.error('Error creating rent bill:', e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * Update rent bill (NO manual paid mutation)
 */
/**
 * Update rent bill
 * Rules:
 * - amount CANNOT be changed after any allocation exists
 * - dueDate CAN be changed anytime
 * - paid status is always derived from allocations
 */
rentBillsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { amount, dueDate } = req.body

    // 1️⃣ Check if bill exists
    const existingBill = await prisma.rentBill.findUnique({
      where: { id }
    })

    if (!existingBill) {
      return res.status(404).json({ error: 'Rent bill not found' })
    }

    // 2️⃣ Check if any allocations exist
    const allocationCount = await prisma.paymentAllocation.count({
      where: {
        billType: 'rent',
        rentBillId: id
      }
    })

    // 3️⃣ Block amount change if allocations exist
    if (amount !== undefined && allocationCount > 0) {
      return res.status(400).json({
        error: 'Cannot change bill amount after payments or credits have been applied'
      })
    }

    const totalPaid = await computeRentBillTotals(id)

    // Block lowering amount below payments
    if (amount !== undefined && amount < totalPaid) {
      return res.status(400).json({
        error: 'Amount cannot be less than total paid'
      })
    }

    // 4️⃣ Perform update (safe fields only)
    const bill = await prisma.rentBill.update({
      where: { id },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    })

    const balance = bill.amount - totalPaid

    // 6️⃣ Return derived state
    res.json({
      id: bill.id,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: totalPaid >= bill.amount,
      totalPaid,
      balance
    })
  } catch (e) {
    console.error('Error updating rent bill:', e)
    res.status(500).json({ error: e.message })
  }
})


/**
 * Delete rent bill (ONLY if no allocations exist)
 */
rentBillsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    const allocationCount = await prisma.paymentAllocation.count({
      where: {
        billType: 'rent',
        rentBillId: id
      }
    })

    if (allocationCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete rent bill with applied payments'
      })
    }

    await prisma.rentBill.delete({ where: { id } })

    res.json({ ok: true })
  } catch (e) {
    console.error('Error deleting rent bill:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = rentBillsRouter
