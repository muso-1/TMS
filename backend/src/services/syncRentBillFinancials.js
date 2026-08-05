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

async function syncRentBillFinancials(
  tx,
  rentBillId
) {
  const bill =
    await tx.rentBill.findUnique({
      where: {
        id: rentBillId,
      },
    })

  if (!bill) {
    throw new Error(
      'Rent bill not found'
    )
  }

  const allocations =
    await tx.paymentAllocation.findMany({
      where: {
        rentBillId: bill.id,
        isReversed: false,
      },
    })

  const totalRentPaid =
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
            totalRentPaid,
          0
        )

  const status =
    deriveBillStatus({
      amount: bill.amount,
      totalPaid: totalRentPaid,
      isVoided: bill.isVoided,
      dueDate: bill.dueDate,
    })

  const paidAt =
    !bill.isVoided &&
    totalRentPaid >= bill.amount
      ? bill.paidAt ??
        new Date()
      : null

  return tx.rentBill.update({
    where: {
      id: bill.id,
    },
    data: {
      totalRentPaid,
      outstandingAmount,
      status,
      paidAt,
    },
  })
}
function buildRentBillResponse(
  bill
) {

  return {
    id: bill.id,

    amount: bill.amount,

    dueDate: bill.dueDate,

    // VOIDING
    isVoided: bill.isVoided,

    voidedAt: bill.voidedAt,

    voidReason: bill.voidReason,

    // FINANCIALS
    status: bill.status,

    totalRentPaid:
      bill.totalRentPaid,

    outstandingAmount:
      bill.outstandingAmount,

    // REMINDERS
    reminderSent:
      bill.reminderSent,

    reminderSentAt:
      bill.reminderSentAt,

    // RELATIONS
    lease: bill.lease && {
      id: bill.lease.id,

      monthlyRent:
        bill.lease.monthlyRent,

      startDate:
        bill.lease.startDate,

      endDate:
        bill.lease.endDate,

      tenant:
        bill.lease.tenant,

      unit:
        bill.lease.unit,
    },
  }
}

module.exports = {
  deriveBillStatus,

  syncRentBillFinancials,

  buildRentBillResponse,
}


