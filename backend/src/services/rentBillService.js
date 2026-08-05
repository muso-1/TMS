const { applyAvailableCreditToBill} = require('./applyAvailableCredit')
const { syncRentBillFinancials} = require('./syncRentBillFinancials')

async function createRentBillWithCredit({
  tx,
  lease,
  amount,
  dueDate
}) {

  // ============================================
  // 1. CREATE BILL
  // ============================================
  const bill = await tx.rentBill.create({
    data: {
      leaseId: lease.id,
      amount,
      dueDate,
      status: 'unpaid',
      totalRentPaid: 0,
      outstandingAmount: amount,
      paidAt: null,
      isVoided: false
    }
  })

await applyAvailableCreditToBill({
  tx,
  tenantId: lease.tenantId,
  billType: 'rent',
  billId: bill.id,
  billAmount: amount
})

await syncRentBillFinancials(
  tx,
  bill.id
)

return bill
}

module.exports = {
  createRentBillWithCredit
}