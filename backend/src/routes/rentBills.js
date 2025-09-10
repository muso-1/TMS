const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')
const { getRentBillSummary } = require('../lib/rentBill.summary')

const prisma = new PrismaClient()
const rentBillsRouter = Router()

// List all bills with summaries
rentBillsRouter.get('/', async (req, res) => {
  try {
    const bills = await prisma.rentBill.findMany({ select: { id: true } })

    const summaries = await Promise.all(
      bills.map(b => getRentBillSummary(b.id))
    )

    res.json(summaries)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get single bill with summary
rentBillsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const summary = await getRentBillSummary(id)
    res.json(summary)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

// Create a bill
rentBillsRouter.post('/', async (req, res) => {
  try {
    const { tenantId, amount, dueDate } = req.body
    if (!tenantId || !amount || !dueDate) {
      return res.status(400).json({ error: 'tenantId, amount, and dueDate are required' })
    }

    const bill = await prisma.rentBill.create({
      data: {
        tenantId: Number(tenantId),
        amount: Number(amount),
        dueDate: new Date(dueDate)
      }
    })

    const summary = await getRentBillSummary(bill.id)
    res.status(201).json(summary)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a bill
rentBillsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { amount, dueDate } = req.body

    await prisma.rentBill.update({
      where: { id },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    })

    const summary = await getRentBillSummary(id)
    res.json(summary)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a bill (and its payments)
rentBillsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    await prisma.payment.deleteMany({ where: { rentBillId: id } })
    await prisma.rentBill.delete({ where: { id } })

    res.json({ message: 'Rent bill and its payments deleted' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = rentBillsRouter
