const nodemailer = require('nodemailer')
const prisma = require('../lib/prisma')

/**
  Sends rent or water bill reminders via email.
  @param {'rent' | 'water'} billType - Type of bill to send reminders for
  @param {Object} [options] - Optional filters
  @param {boolean} [options.onlyNewBills] - If true, send reminders only for newly created bills
  @param {number[]} [options.newBillIds] - List of new bill IDs
*/
async function sendBillReminder(billType, options = {}) {
  const { onlyNewBills = false, newBillIds = [] } = options
  let bills

  // Determine which bills to send reminders for
  if (onlyNewBills && newBillIds.length > 0) {
    bills = await prisma[`${billType}Bill`].findMany({
      where: { id: { in: newBillIds } },
      include: { tenant: true },
    })
  } else {
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
          }

    bills = await prisma[`${billType}Bill`].findMany({
      where: filters,
      include: { tenant: true },
    })
  }

  if (!bills.length) {
    console.log(`No ${billType} bills found for reminders.`)
    return
  }

  console.log(`Preparing to send ${bills.length} ${billType} reminders...`)

  // Setup email transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  // Process each bill
  for (const bill of bills) {
    const tenant = bill.tenant

    if (!tenant?.email) {
      console.warn(
        `Skipping ${billType} bill #${bill.id}: no tenant email.`
      )
      continue
    }

    // Find unpaid past bills for this tenant (excluding current one)
    const unpaidBills = await prisma[`${billType}Bill`].findMany({
      where:
        billType === 'rent'
          ? {
              tenantId: tenant.id,
              paid: false,
              id: { not: bill.id },
            }
          : {
              tenantId: tenant.id,
              status: { not: 'paid' },
              id: { not: bill.id },
            },
    })

    const previousUnpaidTotal = unpaidBills.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    )

    const totalDue = bill.amount + previousUnpaidTotal

    // Compose message dynamically
    const subject =
      billType === 'rent'
        ? 'Rent Payment Reminder'
        : 'Water Bill Payment Reminder'

    const messageLines = [
      `Dear ${tenant.name},`,
      ``,
      billType === 'rent'
        ? `Your rent of Ksh ${bill.amount.toLocaleString()} was due on ${new Date(
            bill.dueDate
          ).toLocaleDateString()}.`
        : `Your water bill of Ksh ${bill.amount.toLocaleString()} is due on ${new Date(
            bill.dueDate
          ).toLocaleDateString()}.`,
    ]

    if (previousUnpaidTotal > 0) {
      messageLines.push(
        `You also have outstanding previous bills totaling Ksh ${previousUnpaidTotal.toLocaleString()}.`
      )
    }

    messageLines.push(``)
    messageLines.push(`Total amount due: Ksh ${totalDue.toLocaleString()}.`)
    messageLines.push(`Please make payment as soon as possible.`)
    messageLines.push(`Thank you.`)

    const message = messageLines.join('\n')

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: tenant.email,
        subject,
        text: message,
      })

      await prisma[`${billType}Bill`].update({
        where: { id: bill.id },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      })

      console.log(
        `Sent ${billType} reminder to ${tenant.email} (Total due: Ksh ${totalDue})`
      )
    } catch (err) {
      console.error(
        `Failed to send ${billType} reminder to ${tenant.email}:`,
        err.message
      )
    }
  }

  console.log(`All ${billType} reminders processed.`)
}

module.exports = {
  sendBillReminder,
}