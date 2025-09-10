const { Router } = require('express')
const { PrismaClient } = require('@prisma/client')
const { recalcRentBillPaidStatus } = require('../lib/rentBill.recalc')


const prisma = new PrismaClient()
const paymentsRouter = Router()


// List payments
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
prisma.payment.findMany({ where, orderBy: { paidAt: 'desc' }, skip, take: pageSize }),
prisma.payment.count({ where })
])


res.json({ page, pageSize, total, items })
} catch (e) {
res.status(500).json({ error: e.message })
}
})


// Get one
paymentsRouter.get('/:id', async (req, res) => {
try {
const id = Number(req.params.id)
const payment = await prisma.payment.findUnique({ where: { id } })
if (!payment) return res.status(404).json({ error: 'Not found' })
res.json(payment)
} catch (e) {
res.status(500).json({ error: e.message })
}
})


// Create
paymentsRouter.post('/', async (req, res) => {
try {
const { rentBillId, amount, paidAt, method, reference, note } = req.body
if (!rentBillId || !amount) return res.status(400).json({ error: 'rentBillId and amount are required' })


const bill = await prisma.rentBill.findUnique({ where: { id: Number(rentBillId) } })
if (!bill) return res.status(400).json({ error: 'Invalid rentBillId' })


const payment = await prisma.payment.create({
data: {
rentBillId: Number(rentBillId),
amount: Number(amount),
paidAt: paidAt ? new Date(paidAt) : new Date(),
method,
reference,
note,
}
})


const summary = await recalcRentBillPaidStatus(Number(rentBillId))
res.status(201).json({ payment, summary })
} catch (e) {
res.status(500).json({ error: e.message })
}
})


// Update
paymentsRouter.patch('/:id', async (req, res) => {
try {
const id = Number(req.params.id)
const existing = await prisma.payment.findUnique({ where: { id }, select: { rentBillId: true } })
if (!existing) return res.status(404).json({ error: 'Not found' })


const payment = await prisma.payment.update({ where: { id }, data: req.body })
const summary = await recalcRentBillPaidStatus(existing.rentBillId)


res.json({ payment, summary })
} catch (e) {
res.status(500).json({ error: e.message })
}
})


// Delete
paymentsRouter.delete('/:id', async (req, res) => {
try {
const id = Number(req.params.id)
const existing = await prisma.payment.findUnique({ where: { id }, select: { rentBillId: true } })
if (!existing) return res.status(404).json({ error: 'Not found' })


await prisma.payment.delete({ where: { id } })
const summary = await recalcRentBillPaidStatus(existing.rentBillId)


res.json({ ok: true, summary })
} catch (e) {
res.status(500).json({ error: e.message })
}
})

// Summary for a bill
paymentsRouter.get('/bill/:rentBillId/summary', async (req, res) => {
try {
const rentBillId = Number(req.params.rentBillId)
const [bill, agg] = await Promise.all([
prisma.rentBill.findUnique({ where: { id: rentBillId } }),
prisma.payment.aggregate({ where: { rentBillId }, _sum: { amount: true } })
])


if (!bill) return res.status(404).json({ error: 'RentBill not found' })


const totalPaid = agg._sum.amount ?? 0
const balance = bill.amount - totalPaid


res.json({
bill: { id: bill.id, amount: bill.amount, dueDate: bill.dueDate, paid: bill.paid },
totals: { totalPaid, balance, fullyPaid: totalPaid >= bill.amount }
})
} catch (e) {
res.status(500).json({ error: e.message })
}
})


module.exports = paymentsRouter