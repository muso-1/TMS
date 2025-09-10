const { PrismaClient } = require('@prisma/client')
const { recalcRentBillPaidStatus } = require('./rentBill.recalc')

const prisma = new PrismaClient()

/**
 * Get a rent bill with derived fields:
 * - totalPaid
 * - balance
 * - tenant info
 * - payments
 * Ensures `paid` is up to date.
 */
async function getRentBillSummary(id) {
  const rentBill = await prisma.rentBill.findUnique({
    where: { id },
    include: { tenant: true, payments: true }
  })

  if (!rentBill) throw new Error('RentBill not found')

  // recalc paid status
  await recalcRentBillPaidStatus(id)

  const totalPaid = rentBill.payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = rentBill.amount - totalPaid

  return {
    ...rentBill,
    totalPaid,
    balance
  }
}

module.exports = { getRentBillSummary }
