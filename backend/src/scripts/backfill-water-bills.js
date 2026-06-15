// scripts/backfill-rent-bills.js

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function deriveBillStatus({
  amount,
  totalWaterPaid,
  isVoided,
  dueDate,
}) {

  if (isVoided) {
    return 'voided'
  }

  if (totalWaterPaid >= amount) {
    return 'paid'
  }

  if (totalWaterPaid > 0) {
    return 'partially_paid'
  }

  const today = new Date()

  if (dueDate < today) {
    return 'overdue'
  }

  return 'unpaid'
}

async function backfillWaterBills() {

  console.log('Starting WaterBill backfill...')

  const bills = await prisma.waterBill.findMany({
    include: {
      allocations: true,
    },
  })

  console.log(`Found ${bills.length} water bills`)

  for (const bill of bills) {

    const totalWaterPaid = bill.allocations.reduce(
      (sum, allocation) =>
        sum + allocation.amount,
      0
    )

    let outstandingAmount = Math.max(
      bill.amount - totalWaterPaid,
      0
    )

    if (bill.isVoided) {
      outstandingAmount = 0
    }

    const status = deriveBillStatus({
      amount: bill.amount,
      totalWaterPaid,
      isVoided: bill.isVoided,
    })

    await prisma.waterBill.update({
      where: {
        id: bill.id,
      },

      data: {
        totalWaterPaid,

        outstandingAmount,

        status,

        paidAt:
          status === 'PAID'
            ? bill.paidAt || new Date()
            : null,
      },
    })

    console.log(
      `Updated WaterBill #${bill.id}`
    )
  }

  console.log('WaterBill backfill complete')
}

async function main() {
  try {

    await backfillWaterBills()

  } catch (error) {

    console.error(
      'Backfill failed:',
      error
    )

  } finally {

    await prisma.$disconnect()
  }
}

main()
