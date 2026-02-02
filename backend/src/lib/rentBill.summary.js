const prisma = require('../lib/prisma')

/**
 * Read-only rent bill summary
 * - NO mutations
 * - NO recalculation side effects
 * - Derived values computed from allocations
 */
async function getRentBillSummary(id) {
  if (!id) throw new Error('RentBill id is required')

  // 1️⃣ Fetch rent bill with lease context
  const rentBill = await prisma.rentBill.findUnique({
    where: { id },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: true
        }
      }
    }
  })

  if (!rentBill) throw new Error('RentBill not found')

  // 2️⃣ Fetch allocations for this bill
  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      billType: 'rent',
      billId: id
    },
    include: {
      payment: true
    }
  })

  // 3️⃣ Derive totals
  const totalPaid = allocations.reduce((sum, a) => sum + a.amount, 0)
  const balance = rentBill.amount - totalPaid

  // 4️⃣ Return summary
  return {
    id: rentBill.id,
    amount: rentBill.amount,
    dueDate: rentBill.dueDate,
    paid: rentBill.paid, // persisted state, not recalculated here
    totalPaid,
    balance,
    allocations: allocations.map(a => ({
      id: a.id,
      amount: a.amount,
      payment: {
        id: a.payment.id,
        amount: a.payment.amount,
        paidAt: a.payment.paidAt,
        method: a.payment.method,
        reference: a.payment.reference,
        note: a.payment.note
      }
    })),
    lease: rentBill.lease
      ? {
          id: rentBill.lease.id,
          startDate: rentBill.lease.startDate,
          endDate: rentBill.lease.endDate,
          monthlyRent: rentBill.lease.monthlyRent,
          tenant: rentBill.lease.tenant
            ? {
                id: rentBill.lease.tenant.id,
                name: rentBill.lease.tenant.name,
                email: rentBill.lease.tenant.email,
                phone: rentBill.lease.tenant.phone
              }
            : null,
          unit: rentBill.lease.unit
            ? {
                id: rentBill.lease.unit.id,
                unitNumber: rentBill.lease.unit.unitNumber,
                status: rentBill.lease.unit.status
              }
            : null
        }
      : null
  }
}

module.exports = { getRentBillSummary }
