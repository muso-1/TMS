const prisma = require('../lib/prisma')

// ------------------------------------------------------------
async function getBillSumsByPeriod(from, to) {

  const [rentAlloc, waterAlloc, rentBills, waterBills] =
    await Promise.all([
      prisma.paymentAllocation.aggregate({
        where: {
          billType: 'rent',
          isReversed: false,
          rentBill: {
            dueDate: { gte: from, lte: to }
          }
        },
        _sum: { amount: true }
      }),

      prisma.paymentAllocation.aggregate({
        where: {
          billType: 'water',
          isReversed: false,
          waterBill: {
            dueDate: { gte: from, lte: to }
          }
        },
        _sum: { amount: true }
      }),

      prisma.rentBill.aggregate({
        where: {
          isVoided: false,
          dueDate: { gte: from, lte: to }
        },
        _sum: { amount: true }
      }),

      prisma.waterBill.aggregate({
        where: {
          isVoided: false,
          dueDate: { gte: from, lte: to }
        },
        _sum: { amount: true }
      })
    ])

  return {
    rent: rentBills._sum?.amount ?? 0,
    rentPaid: rentAlloc._sum?.amount ?? 0,

    water: waterBills._sum?.amount ?? 0,
    waterPaid: waterAlloc._sum?.amount ?? 0,
  }
}

// ------------------------------------------------------------
// RENT SUMMARY USING PERSISTED FINANCIALS
// ------------------------------------------------------------
async function getRentSummary(from, to) {

  const bills = await prisma.rentBill.findMany({
    where: {
      isVoided: false,
      dueDate: { gte: from, lte: to }
    },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      isVoided: true
    }
  })

  const billIds = bills.map(b => b.id)

  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      rentBillId: { in: billIds },
      isReversed: false
    },
    select: {
      amount: true,
      rentBillId: true
    }
  })

  const paidMap = new Map()

  for (const a of allocations) {
    paidMap.set(
      a.rentBillId,
      (paidMap.get(a.rentBillId) || 0) + a.amount
    )
  }

  let billed = 0
  let paid = 0
  let outstanding = 0

  let fullyPaid = 0
  let partiallyPaid = 0
  let unpaid = 0
  let overdue = 0

  const now = new Date()

  for (const bill of bills) {
    const p = paidMap.get(bill.id) || 0
    const o = Math.max(bill.amount - p, 0)

    billed += bill.amount
    paid += p
    outstanding += o

    if (p >= bill.amount) fullyPaid++
    else if (p > 0) partiallyPaid++
    else if (bill.dueDate < now) overdue++
    else unpaid++
  }

  return {
    billed,
    paid,
    outstanding,
    fullyPaid,
    partiallyPaid,
    unpaid,
    overdue,
  }
}

// ------------------------------------------------------------
// WATER SUMMARY USING PERSISTED FINANCIALS
// ------------------------------------------------------------
async function getWaterSummary(from, to) {

  const bills = await prisma.waterBill.findMany({
    where: {
      isVoided: false,
      dueDate: { gte: from, lte: to }
    },
    select: {
      id: true,
      amount: true,
      dueDate: true
    }
  })

  const billIds = bills.map(b => b.id)

  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      waterBillId: { in: billIds },
      isReversed: false
    },
    select: {
      amount: true,
      waterBillId: true
    }
  })

  const paidMap = new Map()

  for (const a of allocations) {
    paidMap.set(
      a.waterBillId,
      (paidMap.get(a.waterBillId) || 0) + a.amount
    )
  }

  let billed = 0
  let paid = 0
  let outstanding = 0

  let fullyPaid = 0
  let partiallyPaid = 0
  let unpaid = 0
  let overdue = 0

  const now = new Date()

  for (const bill of bills) {
    const p = paidMap.get(bill.id) || 0
    const o = Math.max(bill.amount - p, 0)

    billed += bill.amount
    paid += p
    outstanding += o

    if (p >= bill.amount) fullyPaid++
    else if (p > 0) partiallyPaid++
    else if (bill.dueDate < now) overdue++
    else unpaid++
  }

  return {
    billed,
    paid,
    outstanding,
    fullyPaid,
    partiallyPaid,
    unpaid,
    overdue,
  }
}

module.exports = {
  getBillSumsByPeriod,
  getRentSummary,
  getWaterSummary,
}