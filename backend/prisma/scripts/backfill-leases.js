// prisma/scripts/backfill-leases.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Starting backfill...')

  // Get all tenants who have rent bills
  const tenants = await prisma.tenant.findMany({
    where: {
      rentBills: { some: {} }
    }
  })

  for (const t of tenants) {
    // find the most recent rent bill for the tenant to pick a sensible monthlyRent
    const latest = await prisma.rentBill.findFirst({
      where: { tenantId: t.id },
      orderBy: { dueDate: 'desc' },
      take: 1
    })

    if (!latest) continue

    // Create a lease for this tenant (only if one doesn't exist)
    const existingLease = await prisma.lease.findFirst({ where: { tenantId: t.id } })
    let lease
    if (existingLease) {
      lease = existingLease
    } else {
      lease = await prisma.lease.create({
        data: {
          tenantId: t.id,
          monthlyRent: latest.amount,
          startDate: latest.dueDate, // adjust if you prefer earliest date
        }
      })
      console.log(`Created lease ${lease.id} for tenant ${t.id}`)
    }

    // attach all rent bills for this tenant to the lease
    const updated = await prisma.rentBill.updateMany({
      where: { tenantId: t.id, leaseId: null },
      data: { leaseId: lease.id }
    })
    console.log(`Updated ${updated.count} rentBills for tenant ${t.id}`)
  }

  // Verify any remaining rentBills with null leaseId
  const orphans = await prisma.rentBill.count({ where: { leaseId: null } })
  console.log('Remaining rentBills without leaseId:', orphans)

  console.log('Backfill complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
