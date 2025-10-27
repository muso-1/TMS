const prisma = require('../lib/prisma');
const { recalcRentBillPaidStatus } = require('./rentBill.recalc')


/**
 * Get a rent bill with derived fields:
 * - totalPaid
 * - balance
 * - lease info (tenant + unit)
 * - payments
 * Ensures `paid` is up to date.
 */
async function getRentBillSummary(id) {
  // Fetch bill with full lease context
  const rentBill = await prisma.rentBill.findUnique({
    where: { id },
    include: {
      lease: {
        include: {
          tenant: true,
          unit: true
        }
      },
      payments: true
    }
  })

  if (!rentBill) throw new Error('RentBill not found')

  // Ensure `paid` field is accurate
  await recalcRentBillPaidStatus(id)

  // Compute derived fields
  const totalPaid = rentBill.payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = rentBill.amount - totalPaid

  // Return frontend-friendly summary object
  return {
    id: rentBill.id,
    amount: rentBill.amount,
    dueDate: rentBill.dueDate,
    paid: rentBill.paid,
    totalPaid,
    balance,
    payments: rentBill.payments,
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
