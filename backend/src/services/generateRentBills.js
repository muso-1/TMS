const prisma = require('../lib/prisma');
const { sendBillReminder } = require('../services/reminderService'); // <-- Import reminder logic

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

  const newBillIds = []; // collect newly created bill IDs

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
    const dueDate = new Date(today.getFullYear(), today.getMonth(), 5); // 5th of the month
    const bill = await prisma.rentBill.create({
      data: {
        leaseId: lease.id,
        amount: lease.monthlyRent,
        dueDate,
        paid: false,               // explicitly mark as unpaid
        reminderSent: false,       // reminder not sent yet
        reminderSentAt: null       // optional (null by default)
      }
    });
    
    console.log(`Created bill #${bill.id} for ${lease.tenant.name} (${lease.unit.unitNumber})`);
    newBillIds.push(bill.id);
  }

  // Automatically send reminders for newly created bills (optional manual control)
  if (newBillIds.length > 0) {
    console.log(`Sending reminders for ${newBillIds.length} new bills...`);
    await sendBillReminder('rent', { onlyNewBills: true, newBillIds });
  } else {
    console.log('No new bills created. Skipping reminders.');
  }

  console.log('Rent bill generation complete.');
  await prisma.$disconnect();
}

generateMonthlyRentBills()
  .catch(err => {
    console.error('Error generating bills:', err);
    prisma.$disconnect();
    process.exit(1);
  });
