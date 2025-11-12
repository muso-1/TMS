const prisma = require('../lib/prisma');

/**
 * Recalculates the "paid" status of a rent bill based on payments.
 * - Fetches bill, lease.monthlyRent, and total payments
 * - Updates the bill's `paid` field accordingly
 * - Returns totals and payment status summary
 */
async function recalcRentBillPaidStatus(rentBillId) {
  if (!rentBillId) {
    console.warn('⚠️ recalcRentBillPaidStatus called without billId');
    return;
  }

  // Fetch bill with lease info
  const bill = await prisma.rentBill.findUnique({
    where: { id: rentBillId },
    include: { lease: true }
  })

  if (!bill) throw new Error('RentBill not found')

  // Compute total payments for this bill
  const agg = await prisma.payment.aggregate({
    where: { rentBillId },
    _sum: { amount: true }
  })

  const totalPaid = agg._sum.amount ?? 0

  // Use lease.monthlyRent as source of truth if present
  const billAmount = bill.lease?.monthlyRent ?? bill.amount

  // Determine if bill is fully paid
  const fullyPaid = totalPaid >= billAmount

  // Update the bill status
  await prisma.rentBill.update({
    where: { id: rentBillId },
    data: { paid: fullyPaid }
  })

  return {
    totalPaid,
    billAmount,
    fullyPaid
  }
}

module.exports = { recalcRentBillPaidStatus }
