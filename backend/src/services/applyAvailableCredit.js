// services/applyAvailableCreditToBill.js

async function applyAvailableCreditToBill({
  tx,
  tenantId,
  billType,
  billId,
  billAmount
}) {

  // ============================================
  // FETCH AVAILABLE CREDIT
  // ============================================
  const paymentsWithCredit =
    await tx.payment.findMany({
      where: {
        tenantId,
        unappliedAmount: {
          gt: 0
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

  if (!paymentsWithCredit.length) {
    return
  }

  let remaining = billAmount

  // ============================================
  // APPLY CREDIT TO BILL
  // ============================================
  for (const payment of paymentsWithCredit) {

    if (remaining <= 0) {
      break
    }

    const available =
      payment.unappliedAmount

    if (available <= 0) {
      continue
    }

    const toApply = Math.min(
      available,
      remaining
    )

    const allocationData = {
      paymentId: payment.id,
      billType,
      amount: toApply
    }

    if (billType === 'rent') {
      allocationData.rentBillId = billId
    } else if (billType === 'water') {
      allocationData.waterBillId = billId
    } else {
      throw new Error(
        `Unsupported bill type: ${billType}`
      )
    }

    await tx.paymentAllocation.create({
      data: allocationData
    })

    await tx.payment.update({
      where: {
        id: payment.id
      },
      data: {
        totalAllocated: {
          increment: toApply
        },
        unappliedAmount: {
          decrement: toApply
        }
      }
    })

    remaining -= toApply
  }
}

module.exports = {
  applyAvailableCreditToBill
}