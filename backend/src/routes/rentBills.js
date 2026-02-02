const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const rentBillsRouter = Router()

/**
 * Helper: compute financials for a rent bill
 */
async function computeRentBillTotals(billId) {
  const agg = await prisma.paymentAllocation.aggregate({
    where: {
      billType: 'rent',
      billId
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
      bills.map(async (bill) => {
        const totalPaid = await computeRentBillTotals(bill.id)
        const balance = bill.amount - totalPaid

        return {
          id: bill.id,
          amount: bill.amount,
          dueDate: bill.dueDate,
          paid: totalPaid >= bill.amount,
          totalPaid,
          balance,
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
      })
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

    const totalPaid = await computeRentBillTotals(id)
    const balance = bill.amount - totalPaid

    res.json({
      id: bill.id,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: totalPaid >= bill.amount,
      totalPaid,
      balance,
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
    })
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
      where: { id: Number(leaseId) }
    })

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' })
    }

    const bill = await prisma.rentBill.create({
      data: {
        leaseId: lease.id,
        amount: lease.monthlyRent,
        dueDate: new Date(dueDate),
        paid: false
      }
    })

    res.status(201).json({
      id: bill.id,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: false,
      totalPaid: 0,
      balance: bill.amount
    })
  } catch (e) {
    console.error('Error creating rent bill:', e)
    res.status(500).json({ error: e.message })
  }
})

/**
 * Update rent bill (NO manual paid mutation)
 */
rentBillsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { amount, dueDate } = req.body

    const bill = await prisma.rentBill.update({
      where: { id },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    })

    const totalPaid = await computeRentBillTotals(id)

    res.json({
      id: bill.id,
      amount: bill.amount,
      dueDate: bill.dueDate,
      paid: totalPaid >= bill.amount,
      totalPaid,
      balance: bill.amount - totalPaid
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
        billId: id
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
