import prisma from '../lib/prisma.js'
import { recalcRentBillPaidStatus } from './rentBill.recalc.js'
import { recalcWaterBillPaidStatus } from './recalcWaterBillPaidStatus.js'

export async function applyPayment({
  tenantId,
  amount,
  paidAt,
  method,
  reference,
  note
}) {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero')
  }

  return await prisma.$transaction(async (tx) => {
    let remaining = amount
    const allocations = []

    // Create the payment
    const payment = await tx.payment.create({
      data: {
        tenantId,
        amount,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        method,
        reference,
        note
      }
    })

    // Fetch unpaid rent bills (locked to this transaction)
    const rentBills = await tx.rentBill.findMany({
      where: { paid: false, lease: { tenantId } },
      select: { id: true, amount: true, dueDate: true },
      orderBy: { dueDate: 'asc' }
    })

    // Fetch unpaid water bills
    const waterBills = await tx.waterBill.findMany({
      where: { status: 'pending', tenantId },
      select: { id: true, amount: true, dueDate: true },
      orderBy: { dueDate: 'asc' }
    })

    const bills = [
      ...rentBills.map(b => ({ ...b, type: 'rent' })),
      ...waterBills.map(b => ({ ...b, type: 'water' }))
    ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

    // Allocate payment
    for (const bill of bills) {
      if (remaining <= 0) break

      const agg = await tx.paymentAllocation.aggregate({
        where: {
          billType: bill.type,
          ...(bill.type === 'rent'
            ? { rentBillId: bill.id }
            : { waterBillId: bill.id })
        },
        _sum: { amount: true }
      })

      const alreadyPaid = agg._sum.amount ?? 0
      const billBalance = bill.amount - alreadyPaid

      if (billBalance <= 0) continue

      const toApply = Math.min(remaining, billBalance)

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          billType: bill.type,
          amount: toApply,
          ...(bill.type === 'rent'
            ? { rentBillId: bill.id }
            : { waterBillId: bill.id })
        }
      })

      allocations.push({
        billId: bill.id,
        type: bill.type,
        applied: toApply
      })

      remaining -= toApply

      if (bill.type === 'rent') {
        await recalcRentBillPaidStatus(bill.id, tx)
      } else {
        await recalcWaterBillPaidStatus(bill.id, tx)
      }
    }


    return {
      paymentId: payment.id,
      totalAllocated: amount - remaining,
      unallocated: remaining,
      allocations
    }
  })
}
