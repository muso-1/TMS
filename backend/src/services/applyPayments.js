const prisma = require('../lib/prisma')

const {
  syncRentBillFinancials
} = require('../services/syncRentBillFinancials')

const {
  syncWaterBillFinancials
} = require('../services/syncWaterBillFinancials')

const {
  syncPaymentFinancials
} = require('../services/syncPaymentFinancials')

// ======================================================
// APPLY PAYMENT
// ======================================================

async function applyPayment({
  tenantId,
  amount,
  paidAt,
  method,
  reference,
  note
}) {

  // ====================================================
  // VALIDATION
  // ====================================================

  const paymentAmount = Number(amount)

  if (!tenantId) {
    throw new Error('tenantId is required')
  }

  if (
    Number.isNaN(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error(
      'Payment amount must be greater than zero'
    )
  }

  return prisma.$transaction(async (tx) => {

    let remaining = paymentAmount

    const allocations = []

    // ==================================================
    // CREATE PAYMENT (LEDGER ROOT)
    // SNAPSHOTS INITIALIZED ONLY
    // ==================================================

    const payment = await tx.payment.create({
      data: {
        tenantId,

        amountReceived: paymentAmount,

        // SNAPSHOT FIELDS
        totalAllocated: 0,
        unappliedAmount: paymentAmount,

        paidAt:
          paidAt
            ? new Date(paidAt)
            : new Date(),

        method,
        reference,
        note
      }
    })

    // ==================================================
    // FETCH ELIGIBLE RENT BILLS
    // USING SNAPSHOTS FOR FAST UI/READS
    // ==================================================

    const rentBills =
      await tx.rentBill.findMany({
        where: {
          lease: {
            tenantId
          },

          isVoided: false,

          status: {
            in: [
              'unpaid',
              'partially_paid',
              'overdue'
            ]
          },

          outstandingAmount: {
            gt: 0
          }
        },

        orderBy: [
          {
            dueDate: 'asc'
          },
          {
            createdAt: 'asc'
          }
        ]
      })

    // ==================================================
    // FETCH ELIGIBLE WATER BILLS
    // ==================================================

    const waterBills =
      await tx.waterBill.findMany({
        where: {
          tenantId,

          isVoided: false,

          status: {
            in: [
              'unpaid',
              'partially_paid',
              'overdue'
            ]
          },

          outstandingAmount: {
            gt: 0
          }
        },

        orderBy: [
          {
            dueDate: 'asc'
          },
          {
            createdAt: 'asc'
          }
        ]
      })

    // ==================================================
    // MERGE + SORT
    // ==================================================

    const bills = [

      ...rentBills.map((bill) => ({
        ...bill,
        type: 'rent'
      })),

      ...waterBills.map((bill) => ({
        ...bill,
        type: 'water'
      }))

    ].sort(
      (a, b) =>
        new Date(a.dueDate) -
        new Date(b.dueDate)
    )

    // ==================================================
    // ALLOCATION LOOP
    // ==================================================

    for (const bill of bills) {

      if (remaining <= 0) {
        break
      }

      // EXTRA SAFETY
      if (bill.isVoided) {
        continue
      }

      const billBalance =
        Number(
          bill.outstandingAmount || 0
        )

      if (billBalance <= 0) {
        continue
      }

      const toApply =
        Math.min(
          remaining,
          billBalance
        )

      // ================================================
      // CREATE LEDGER ENTRY
      // ================================================

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,

          billType: bill.type,

          amount: toApply,

          ...(bill.type === 'rent'
            ? {
                rentBillId: bill.id
              }
            : {
                waterBillId: bill.id
              })
        }
      })

      allocations.push({
        billId: bill.id,
        type: bill.type,
        applied: toApply
      })

      remaining -= toApply

      // ================================================
      // RESYNC BILL SNAPSHOTS
      // ================================================

      if (bill.type === 'rent') {

        await syncRentBillFinancials(
          tx,
          bill.id
        )

      } else {

        await syncWaterBillFinancials(
          tx,
          bill.id
        )
      }
    }

    // ==================================================
    // RESYNC PAYMENT SNAPSHOTS
    // CRITICAL:
    // NEVER MANUALLY COMPUTE SNAPSHOT STATE
    // ==================================================

    await syncPaymentFinancials(
      tx,
      payment.id
    )

    // ==================================================
    // RETURN RESULT
    // ==================================================

    const syncedPayment =
      await tx.payment.findUnique({
        where: {
          id: payment.id
        }
      })

    return {
      paymentId: payment.id,

      amountReceived:
        syncedPayment.amountReceived,

      totalAllocated:
        syncedPayment.totalAllocated,

      unappliedAmount:
        syncedPayment.unappliedAmount,

      allocations
    }
  })
}

module.exports = {
  applyPayment
}