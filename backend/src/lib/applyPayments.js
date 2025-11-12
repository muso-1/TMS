import prisma from '../lib/prisma.js'
import { recalcRentBillPaidStatus } from './rentBill.recalc.js'
import { recalcWaterBillPaidStatus } from './recalcWaterBillPaidStatus.js'

/**
 * Applies a tenant payment across unpaid bills (rent first, then water).
 * Supports partial, full, and overpayments.
 */
export async function applyPayment({
  tenantId,
  amount,
  paidAt,
  method,
  reference,
  note
}) {
  let remaining = amount
  const allocations = []

  // 1️⃣ Fetch unpaid rent & water bills (ensure IDs and amounts are selected)
  const rentBills = await prisma.rentBill.findMany({
    where: { lease: { tenantId }, paid: false },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      leaseId: true,
      lease: {
        select: { tenantId: true, unitId: true }
      }
    },
    orderBy: { dueDate: 'asc' }
  })

  // Note: WaterBill uses `dueDate` and `status` (not `billingDate` / `paid`)
  const waterBills = await prisma.waterBill.findMany({
    where: { tenantId, status: { not: 'paid' } },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      status: true
    },
    orderBy: { dueDate: 'asc' }
  })

  // 2️⃣ Combine and sort all unpaid bills by date
  const bills = [
    ...rentBills.map(b => ({ ...b, type: 'rent', date: b.dueDate })),
    ...waterBills.map(b => ({ ...b, type: 'water', date: b.dueDate }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  // 3️⃣ Iterate and allocate payments
  for (const bill of bills) {
    const billId = bill.id
    const billType = bill.type

    if (!billId) {
      console.warn(`⚠️ Skipping bill with missing id: ${JSON.stringify(bill)}`)
      continue
    }

    // Compute remaining balance for this bill
    const paidAgg = await prisma.payment.aggregate({
      where:
        billType === 'rent'
          ? { rentBillId: billId }
          : { waterBillId: billId },
      _sum: { amount: true }
    })
    const alreadyPaid = paidAgg._sum.amount || 0
    const billBalance = bill.amount - alreadyPaid

    if (billBalance <= 0) continue

    const amountToApply = Math.min(remaining, billBalance)

    // Create payment record
    await prisma.payment.create({
      data: {
        tenantId,
        amount: amountToApply,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        method,
        reference,
        note,
        rentBillId: billType === 'rent' ? billId : null,
        waterBillId: billType === 'water' ? billId : null
      }
    })

    allocations.push({ billId, type: billType, applied: amountToApply })

    // Update remaining amount
    remaining -= amountToApply

    // Recalculate bill paid status safely
    if (billType === 'rent') {
      await recalcRentBillPaidStatus(billId)
    } else {
      await recalcWaterBillPaidStatus(billId)
    }

    // Stop allocation if fully applied
    if (remaining <= 0) break
  }

  // 4️⃣ Handle overpayment (unallocated balance)
  if (remaining > 0) {
    await prisma.payment.create({
      data: {
        tenantId,
        amount: remaining,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        method,
        reference,
        note: `Unallocated balance (${note || ''})`
      }
    })
    allocations.push({ billId: null, type: 'unallocated', applied: remaining })
  }

  return {
    allocations,
    totalApplied: amount - remaining,
    overpayment: remaining
  }
}
