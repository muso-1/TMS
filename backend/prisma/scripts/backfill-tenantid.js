import prisma from '../../src/lib/prisma.js';

async function backfillTenantIds() {
  console.log('🔄 Starting tenantId backfill for Payment table...');

  const payments = await prisma.payment.findMany({
    where: { tenantId: null },
    include: {
      rentBill: {
        include: {
          lease: true,
        },
      },
    },
  });

  if (payments.length === 0) {
    console.log('✅ No payments require backfilling.');
    await prisma.$disconnect();
    return;
  }

  for (const payment of payments) {
    const tenantId = payment.rentBill?.lease?.tenantId;
    if (tenantId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { tenantId },
      });
      console.log(`✅ Payment #${payment.id} → Tenant #${tenantId}`);
    } else {
      console.warn(`⚠️ Payment #${payment.id} skipped — could not resolve tenant.`);
    }
  }

  console.log('🎯 Backfill complete.');
  await prisma.$disconnect();
}

backfillTenantIds()
  .catch((err) => {
    console.error('❌ Error during backfill:', err);
    prisma.$disconnect();
  });
