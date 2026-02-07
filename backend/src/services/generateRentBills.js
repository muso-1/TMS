const prisma = require('../lib/prisma');
const { sendBillReminder } = require('../services/reminderService'); // <-- Import reminder logic
const { recalcRentBillPaidStatus } = require('../lib/rentBill.recalc')

async function generateMonthlyRentBills() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  console.log(`Generating rent bills for ${monthStart.toISOString().slice(0, 7)}`);

  // Find all active leases
  const leases = await prisma.lease.findMany({
    where: {
      startDate: { lte: monthEnd },
      OR: [{ endDate: null }, { endDate: { gte: monthStart } }]
    },
    include: { tenant: true, unit: true }
  });

  const newBillIds = []; // collect unpaid new bills

  for (const lease of leases) {
    // Check if a bill for this month already exists
    const existing = await prisma.rentBill.findFirst({
      where: {
        leaseId: lease.id,
        dueDate: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    if (existing) {
      console.log(`Bill already exists for lease ${lease.id} (${lease.tenant.name})`);
      continue;
    }

    // Create the new bill
    const bill = await prisma.$transaction(async (tx) => {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), 5)

      return createRentBillWithCredit({
        tx,
        lease,
        amount: lease.monthlyRent,
        dueDate
      })
    })
    
    console.log(`Created bill #${bill.id} for ${lease.tenant.name} (${lease.unit.unitNumber})`);
    newBillIds.push(bill.id);
  }

  // Automatically send reminders for unpaid bills (optional manual control)
  if (newBillIds.length > 0) {
    console.log(`Sending reminders for ${newBillIds.length} unpaid bills...`)
    await sendBillReminder('rent', {
      onlyNewBills: true,
      newBillIds
    })
  } else {
    console.log('No unpaid new bills. Skipping reminders.')
  }

  console.log('Rent bill generation complete.')
  await prisma.$disconnect()
}

generateMonthlyRentBills().catch(err => {
  console.error('Fatal error generating bills:', err)
  prisma.$disconnect()
  process.exit(1)
})