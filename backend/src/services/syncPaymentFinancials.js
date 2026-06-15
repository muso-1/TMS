// ======================================================
// SYNC PAYMENT FINANCIAL SNAPSHOTS
// ======================================================

async function syncPaymentFinancials(
  tx,
  paymentId
) {
  const payment =
    await tx.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        allocations: {
          where: {
            isReversed: false,
          },
        },
      },
    })

  if (!payment) {
    throw new Error(
      'Payment not found'
    )
  }

  // Reversed payments contribute nothing
  if (payment.isReversed) {
    return tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        totalAllocated: 0,
        unappliedAmount: 0,
      },
    })
  }

  const amountReceived =
    payment.amountReceived || 0

  const totalAllocated =
    payment.allocations.reduce(
      (sum, allocation) =>
        sum + (allocation.amount || 0),
      0
    )

  const unappliedAmount =
    Math.max(
      amountReceived -
        totalAllocated,
      0
    )

  return tx.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      totalAllocated,
      unappliedAmount,
    },
  })
}

module.exports = {
  syncPaymentFinancials,
}
