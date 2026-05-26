const prisma = require('../lib/prisma')

// ------------------------------------------------------------
// Returns: { rent: number, water: number }
// Always returns both keys, even when there are no allocations.
// ------------------------------------------------------------
async function getAllocationSumsByBillPeriod(
  from,
  to
) {
  const rows =
    await prisma.paymentAllocation.groupBy({
      by: ['billType'],

      where: {
        billType: {
          in: ['rent', 'water']
        },

        OR: [
          {
            rentBill: {
              isVoided: false,

              dueDate: {
                gte: from,
                lte: to
              }
            }
          },

          {
            waterBill: {
              isVoided: false,

              dueDate: {
                gte: from,
                lte: to
              }
            }
          }
        ]
      },

      _sum: {
        amount: true
      }
    })

  const result = {
    rent: 0,
    water: 0
  }

  for (const row of rows || []) {
    if (
      row.billType === 'rent' ||
      row.billType === 'water'
    ) {
      result[row.billType] =
        row._sum?.amount ?? 0
    }
  }

  return result
}

// ------------------------------------------------------------
// Returns: number
// Always returns 0 when there are no rent bills.
// ------------------------------------------------------------
async function getRentBilled(from, to) {
  const agg = await prisma.rentBill.aggregate({
    where: {
      isVoided: false,
      dueDate: {
        gte: from,
        lte: to
      }
    },
    _sum: {
      amount: true
    }
  })

  return agg?._sum?.amount ?? 0
}

// ------------------------------------------------------------
// Returns: Array<{ id: string, amount: number }>
// Always returns an array.
// ------------------------------------------------------------
async function getRentBillsInPeriod(from, to) {
  const bills = await prisma.rentBill.findMany({
    where: {
      isVoided: false,

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

  return bills ?? []
}

// ------------------------------------------------------------
// Returns: { [rentBillId]: number }
// Always returns an object.
// ------------------------------------------------------------
async function getRentAllocationsByBill() {
  const rows = await prisma.paymentAllocation.groupBy({
    by: ['rentBillId'],
    where: {
      billType: 'rent',
      rentBillId: {
        not: null
      },
      rentBill: {
        isVoided: false
      }
    },
    _sum: {
      amount: true
    }
  })

  const map = {}

  for (const row of rows || []) {
    if (row.rentBillId != null) {
      map[row.rentBillId] = row._sum?.amount ?? 0
    }
  }

  return map
}

// ------------------------------------------------------------
// Returns:
// {
//   fullyPaid: number,
//   partiallyPaid: number,
//   unpaid: number,
//   totalPaid: number
// }
// Always returns all fields.
// ------------------------------------------------------------
function classifyRentBills(rentBills = [], allocationMap = {}) {
  let fullyPaid = 0
  let partiallyPaid = 0
  let unpaid = 0
  let totalPaid = 0

  for (const bill of rentBills) {
    const amount = bill?.amount ?? 0
    const paid = allocationMap?.[bill?.id] ?? 0

    totalPaid += paid

    if (paid === 0) {
      unpaid++
    } else if (paid < amount) {
      partiallyPaid++
    } else {
      fullyPaid++
    }
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