const prisma = require('../lib/prisma')

/**
 * Recalculates the "paid" status of a rent bill based on allocations.
 * Must run inside the same transaction as payment application.
 */
async function recalcRentBillPaidStatus(rentBillId, tx = prisma) {
  if (!rentBillId) {
    console.warn('recalcRentBillPaidStatus called without rentBillId')
    return
  }

  // Fetch bill USING tx
  const bill = await tx.rentBill.findUnique({
    where: { id: rentBillId }
  })

  if (!bill) throw new Error('RentBill not found')

  // Sum allocations USING tx (UPDATED)
  const agg = await tx.paymentAllocation.aggregate({
    where: {
      billType: 'rent',
      rentBillId: rentBillId
    },
    _sum: { amount: true }
  })

  const totalPaid = agg._sum.amount ?? 0
  const billAmount = bill.amount
  const fullyPaid = totalPaid >= billAmount

  // Update bill USING tx
  await tx.rentBill.update({
    where: { id: rentBillId },
    data: {
      paid: fullyPaid,
      paidAt: fullyPaid ? new Date() : null
    }
  })

  return {
    totalPaid,
    billAmount,
    fullyPaid
  }
}

module.exports = { recalcRentBillPaidStatus }
