import prisma from '../../src/lib/prisma.js';

async function backfillTenantBalances() {
  // 1. Get all tenants who have ever made payments
  const tenants = await prisma.payment.findMany({
    select: { tenantId: true },
    distinct: ['tenantId']
  })

  for (const { tenantId } of tenants) {
    // 2. Sum payments
    const paymentSum = await prisma.payment.aggregate({
      where: { tenantId },
      _sum: { amount: true }
    })

    // 3. Sum allocations via payments
    const allocationSum = await prisma.paymentAllocation.aggregate({
      where: {
        payment: { tenantId }
      },
      _sum: { amount: true }
    })

    const totalPaid = paymentSum._sum.amount ?? 0
    const totalAllocated = allocationSum._sum.amount ?? 0

    const balance = totalPaid - totalAllocated

    // 4. Upsert tenant balance
    await prisma.tenantBalance.upsert({
      where: { tenantId },
      update: { balance },
      create: {
        tenantId,
        balance
      }
    })

    console.log(
      `Tenant ${tenantId}: paid=${totalPaid}, allocated=${totalAllocated}, balance=${balance}`
    )
  }
}

await backfillTenantBalances()
