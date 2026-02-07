const { recalcRentBillPaidStatus } = require('../lib/rentBill.recalc')

/**
 * Creates a rent bill and automatically applies tenant credit (if any)
 */
async function createRentBillWithCredit({
  tx,
  lease,
  amount,
  dueDate
}) {
  // 1. Create rent bill
  const bill = await tx.rentBill.create({
    data: {
      leaseId: lease.id,
      amount,
      dueDate,
      paid: false,
      reminderSent: false,
      reminderSentAt: null
    }
  })

  // 2. Fetch tenant balance
  const tenantBalance = await tx.tenantBalance.findUnique({
    where: { tenantId: lease.tenantId }
  })

  if (!tenantBalance || tenantBalance.balance <= 0) {
    return bill
  }

  // 3. Apply available credit
  const creditToApply = Math.min(
    tenantBalance.balance,
    bill.amount
  )

  if (creditToApply > 0) {
    // Create a system payment representing credit usage
    const creditPayment = await tx.payment.create({
      data: {
        tenantId: lease.tenantId,
        amount: creditToApply,
        paidAt: new Date(),
        method: 'credit',
        reference: `CREDIT-${bill.id}`,
        note: 'Auto-applied tenant credit'
      }
    })
    
    // Allocate that payment to the bill
    await tx.paymentAllocation.create({
      data: {
        paymentId: creditPayment.id,
        billType: 'rent',
        rentBillId: bill.id,
        amount: creditToApply
      }
    })

    //Reduce tenant balance
    await tx.tenantBalance.update({
      where: { tenantId: lease.tenantId },
      data: {
        balance: {
          decrement: creditToApply
        }
      }
    })

    // 4. Recalculate paid status
    await recalcRentBillPaidStatus(bill.id, tx)
  }

  return bill
}

module.exports = {
  createRentBillWithCredit
}
