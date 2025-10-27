import nodemailer from 'nodemailer';
import prisma from '../lib/prisma.js';

/**
 * Sends rent or water bill reminders via email.
 * @param {'rent' | 'water'} billType - Type of bill to send reminders for
 * @param {Object} [options] - Optional filters
 * @param {boolean} [options.onlyNewBills] - If true, send reminders only for newly created bills
 * @param {number[]} [options.newBillIds] - List of new bill IDs
 */
export async function sendBillReminder(billType, options = {}) {
  const { onlyNewBills = false, newBillIds = [] } = options;
  let bills;

  // Determine which bills to send reminders for
  if (onlyNewBills && newBillIds.length > 0) {
    // Send only newly created bills
    bills = await prisma[`${billType}Bill`].findMany({
      where: { id: { in: newBillIds } },
      include:
        billType === 'rent'
          ? { tenant: true }
          : { tenant: true },
    });
  } else {
    // Default: all unpaid or pending bills that haven’t been reminded yet
    const filters =
      billType === 'rent'
        ? {
            paid: false,
            reminderSent: false,
            dueDate: { lte: new Date() },
          }
        : {
            status: { not: 'paid' },
            reminderSent: false,
            dueDate: { lte: new Date() },
          };

    bills = await prisma[`${billType}Bill`].findMany({
      where: filters,
      include:
        billType === 'rent'
          ? { tenant: true }
          : { tenant: true },
    });
  }

  if (!bills.length) {
    console.log(`No ${billType} bills found for reminders.`);
    return;
  }

  console.log(`Preparing to send ${bills.length} ${billType} reminders...`);

  // Setup transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  // Send reminders
  for (const bill of bills) {
    const tenant = bill.tenant;

    if (!tenant?.email) {
      console.warn(`Skipping ${billType} bill #${bill.id}: no tenant email.`);
      continue;
    }

    const subject =
      billType === 'rent'
        ? 'Rent Payment Reminder'
        : 'Water Bill Payment Reminder';

    const message =
      billType === 'rent'
        ? `Dear ${tenant.name}, your rent of Ksh ${bill.amount} was due on ${new Date(
            bill.dueDate
          ).toLocaleDateString()}. Please make payment soon.`
        : `Dear ${tenant.name}, your water bill of Ksh ${bill.amount} is due on ${new Date(
            bill.dueDate
          ).toLocaleDateString()}. Kindly settle soon.`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: tenant.email,
        subject,
        text: message,
      });

      await prisma[`${billType}Bill`].update({
        where: { id: bill.id },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      });

      console.log(`Sent ${billType} reminder to ${tenant.email}`);
    } catch (err) {
      console.error(`Failed to send ${billType} reminder to ${tenant.email}:`, err.message);
    }
  }

  console.log(`All ${billType} reminders processed.`);
}
