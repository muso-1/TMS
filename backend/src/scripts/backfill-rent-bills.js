// scripts/backfill-rent-bills.js

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function deriveBillStatus({
  amount,
  totalRentPaid,
  isVoided,
  dueDate,
}) {

  if (isVoided) {
    return 'voided'
  }

  if (totalRentPaid >= amount) {
    return 'paid'
  }

  if (totalRentPaid > 0) {
    return 'partially_paid'
  }

  const today = new Date()

  if (dueDate < today) {
    return 'overdue'
  }

  return 'unpaid'
}

async function backfillRentBills() {

  console.log('Starting RentBill backfill...')

  const bills = await prisma.rentBill.findMany({
    include: {
      allocations: true,
    },
  })

  console.log(`Found ${bills.length} rent bills`)

  for (const bill of bills) {

    const totalRentPaid = bill.allocations.reduce(
      (sum, allocation) =>
        sum + allocation.amount,
      0
    )

    let outstandingAmount = Math.max(
      bill.amount - totalRentPaid,
      0
    )

    if (bill.isVoided) {
      outstandingAmount = 0
    }

    const status = deriveBillStatus({
      amount: bill.amount,
      totalRentPaid,
      isVoided: bill.isVoided,
    })

    await prisma.rentBill.update({
      where: {
        id: bill.id,
      },

      data: {
        totalRentPaid,

        outstandingAmount,

        status,

        paidAt:
          status === 'PAID'
            ? bill.paidAt || new Date()
            : null,
      },
    })

    console.log(
      `Updated RentBill #${bill.id}`
    )
  }

  console.log('RentBill backfill complete')
}

async function main() {
  try {

    await backfillRentBills()

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
