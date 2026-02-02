import prisma from '../lib/prisma.js'

/**
 * Recalculates the "status" of a WaterBill based on allocations.
 * - Marks as "paid" when fully settled.
 * - Reverts to "pending" otherwise.
 */
export async function recalcWaterBillPaidStatus(waterBillId, tx = prisma) {
  if (!waterBillId) {
    console.warn('recalcWaterBillPaidStatus called without waterBillId')
    return
  }

  // Fetch the bill
  const bill = await tx.waterBill.findUnique({
    where: { id: waterBillId },
    select: { id: true, amount: true, status: true }
  })

  if (!bill) {
    throw new Error(`WaterBill not found (id=${waterBillId})`)
  }

  // Sum allocations applied to this water bill (UPDATED)
  const agg = await tx.paymentAllocation.aggregate({
    where: {
      billType: 'water',
      waterBillId: waterBillId
    },
    _sum: { amount: true }
  })

  const totalPaid = agg._sum.amount ?? 0
  const fullyPaid = totalPaid >= bill.amount
  const newStatus = fullyPaid ? 'paid' : 'pending'

  // Avoid unnecessary writes
  if (bill.status !== newStatus) {
    await tx.waterBill.update({
      where: { id: waterBillId },
      data: {
        status: newStatus,
        paidAt: fullyPaid ? new Date() : null
      }
    })
  }

  return {
    billId: bill.id,
    billAmount: bill.amount,
    totalPaid,
    status: newStatus
  }
}
