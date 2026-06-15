function deriveBillStatus({
  amount,
  totalPaid,
  isVoided,
  dueDate,
}) {
  if (isVoided) return 'voided'

  if (totalPaid >= amount) return 'paid'

  if (totalPaid > 0 && totalPaid < amount) return 'partially_paid'

  if (new Date(dueDate) < new Date()) return 'overdue'

  return 'unpaid'
}

// ======================================================
// SYNC WATER BILL FINANCIALS
// ======================================================
async function syncWaterBillFinancials(
  tx,
  waterBillId
) {
  const bill =
    await tx.waterBill.findUnique({
      where: {
        id: waterBillId,
      },
    })

  if (!bill) {
    throw new Error(
      'Water bill not found'
    )
  }

  const allocations =
    await tx.paymentAllocation.findMany({
      where: {
        waterBillId: bill.id,
        isReversed: false,
      },
    })

  const totalWaterPaid =
    allocations.reduce(
      (sum, allocation) =>
        sum + (allocation.amount || 0),
      0
    )

  const outstandingAmount =
    bill.isVoided
      ? 0
      : Math.max(
          bill.amount -
            totalWaterPaid,
          0
        )

  const status =
    deriveBillStatus({
      amount: bill.amount,
      totalPaid: totalWaterPaid,
      isVoided: bill.isVoided,
      dueDate: bill.dueDate,
    })

  const paidAt =
    status === 'paid'
      ? bill.paidAt ??
        new Date()
      : null

  return tx.waterBill.update({
    where: {
      id: bill.id,
    },
    data: {
      totalWaterPaid,
      outstandingAmount,
      status,
      paidAt,
    },
  })
}

// ======================================================
// RESPONSE BUILDER
// ======================================================

function buildWaterBillResponse(
  bill
) {

  return {
    id: bill.id,

    tenantId:
      bill.tenantId,

    unitId:
      bill.unitId,

    meterReadingId:
      bill.meterReadingId,

    previousReading:
      bill.previousReading,

    currentReading:
      bill.currentReading,

    unitsUsed:
      bill.unitsUsed,

    amount:
      bill.amount,

    dueDate:
      bill.dueDate,

    // STATUS
    status:
      bill.status,

    // FINANCIALS
    totalWaterPaid:
      bill.totalWaterPaid,

    outstandingAmount:
      bill.outstandingAmount,

    // VOIDING
    isVoided:
      bill.isVoided,

    voidedAt:
      bill.voidedAt,

    voidReason:
      bill.voidReason,

    createdAt:
      bill.createdAt,

    tenant:
      bill.tenant,

    unit:
      bill.unit,
  }
}

module.exports = {
  deriveBillStatus,
  
  syncWaterBillFinancials,

  buildWaterBillResponse,
}
