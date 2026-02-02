const prisma = require('../lib/prisma')

async function getAllocationSumsByBillPeriod(from, to) {
  const rows = await prisma.paymentAllocation.groupBy({
    by: ['billType'],
    where: {
      billType: { in: ['rent', 'water'] },
      OR: [
        {
          rentBill: { dueDate: { gte: from, lte: to } }
        },
        {
          waterBill: { dueDate: { gte: from, lte: to } }
        }
      ]
    },
    _sum: { amount: true }
  })

  return rows.reduce(
    (acc, r) => {
      acc[r.billType] = r._sum.amount ?? 0
      return acc
    },
    { rent: 0, water: 0 }
  )
}

async function getRentBilled(from, to) {
  const agg = await prisma.rentBill.aggregate({
    where: {
      dueDate: {
        gte: from,
        lte: to
      }
    },
    _sum: { amount: true }
  })

  return agg._sum.amount ?? 0
}

async function getRentBillsInPeriod(from, to) {
  return prisma.rentBill.findMany({
    where: {
      dueDate: {
        gte: from,
        lte: to
      }
    },
    select: {
      id: true,
      amount: true
    }
  })
}

async function getRentAllocationsByBill() {
  const rows = await prisma.paymentAllocation.groupBy({
    by: ['rentBillId'],
    where: {
      billType: 'rent',
      rentBillId: { not: null }
    },
    _sum: { amount: true }
  })

  return rows.reduce((map, r) => {
    map[r.rentBillId] = r._sum.amount ?? 0
    return map
  }, {})
}

function classifyRentBills(rentBills, allocationMap) {
  let fullyPaid = 0
  let partiallyPaid = 0
  let unpaid = 0
  let totalPaid = 0

  for (const bill of rentBills) {
    const paid = allocationMap[bill.id] ?? 0
    totalPaid += paid

    if (paid === 0) unpaid++
    else if (paid < bill.amount) partiallyPaid++
    else fullyPaid++
  }

  return {
    fullyPaid,
    partiallyPaid,
    unpaid,
    totalPaid
  }
}

module.exports = {
  getAllocationSumsByBillPeriod,
  getRentBilled,
  getRentBillsInPeriod,
  getRentAllocationsByBill,
  classifyRentBills
}
