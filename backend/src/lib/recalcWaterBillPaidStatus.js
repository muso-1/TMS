import prisma from '../lib/prisma.js'

/**
 * Recalculates the "status" of a WaterBill based on total payments.
 * - Marks as "paid" when fully settled.
 * - Keeps or reverts to "pending" when partially or not paid.
 */
export async function recalcWaterBillPaidStatus(waterBillId) {
  // Fetch the bill
  const bill = await prisma.waterBill.findUnique({
    where: { id: waterBillId },
    select: { id: true, amount: true, status: true }
  })

  if (!bill) throw new Error(`WaterBill not found (id=${waterBillId})`)

  // Calculate total payments made toward this bill
  const agg = await prisma.payment.aggregate({
    where: { waterBillId },
    _sum: { amount: true }
  })

  const totalPaid = agg._sum.amount ?? 0
  const fullyPaid = totalPaid >= bill.amount

  // Update the status accordingly
  await prisma.waterBill.update({
    where: { id: waterBillId },
    data: {
      status: fullyPaid ? 'paid' : 'pending'
    }
  })

  return {
    billId: bill.id,
    billAmount: bill.amount,
    totalPaid,
    status: fullyPaid ? 'paid' : 'pending'
  }
}
