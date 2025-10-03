const { PrismaClient } = require('@prisma/client')
const { recalcRentBillPaidStatus } = require('./rentBill.recalc')

const prisma = new PrismaClient()

/**
 * Get a rent bill summary with derived fields and full context:
 * - totalPaid & balance
 * - tenant and unit info (via lease)
 * - payments list
 * - monthlyRent info from lease
 */
async function getRentBillSummary(id) {
  // Fetch the rent bill and include its lease, tenant, unit, and payments
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

  // Ensure the `paid` status is accurate
  await recalcRentBillPaidStatus(id)

  // Calculate derived totals
  const totalPaid = rentBill.payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = rentBill.amount - totalPaid

  // Build a structured summary
  return {
    id: rentBill.id,
    leaseId: rentBill.leaseId,
    amount: rentBill.amount,
    dueDate: rentBill.dueDate,
    paid: rentBill.paid,
    totalPaid,
    balance,
    payments: rentBill.payments,
    lease: rentBill.lease && {
      id: rentBill.lease.id,
      startDate: rentBill.lease.startDate,
      endDate: rentBill.lease.endDate,
      monthlyRent: rentBill.lease.monthlyRent,
      tenant: rentBill.lease.tenant && {
        id: rentBill.lease.tenant.id,
        name: rentBill.lease.tenant.name,
        email: rentBill.lease.tenant.email,
        phone: rentBill.lease.tenant.phone
      },
      unit: rentBill.lease.unit && {
        id: rentBill.lease.unit.id,
        unitNumber: rentBill.lease.unit.unitNumber,
        status: rentBill.lease.unit.status
      }
    }
  }
}

module.exports = { getRentBillSummary }
