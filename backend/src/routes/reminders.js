import express from 'express';
import { sendBillReminder } from '../services/reminderService.js';

const remindersRouter = express.Router();

/**
 * @route POST /api/reminders/rent
 * @desc Send rent bill reminders for newly created bills
 * @body { onlyNewBills?: boolean, newBillIds?: number[] }
 */
remindersRouter.post('/rent', async (req, res) => {
  const { onlyNewBills = false, newBillIds = [] } = req.body;

  try {
    await sendBillReminder('rent', { onlyNewBills, newBillIds });
    res.json({
      message: onlyNewBills
        ? 'Rent reminders sent for newly created bills.'
        : 'Rent reminders sent successfully.',
    });
  } catch (error) {
    console.error('Error sending rent reminders:', error);
    res.status(500).json({ error: 'Failed to send rent reminders.' });
  }
});

/**
 * @route POST /api/reminders/rent/bulk
 * @desc Send bulk rent reminders for all unpaid or overdue rent bills
 */
remindersRouter.post('/rent/bulk', async (req, res) => {
  try {
    await sendBillReminder('rent');
    res.json({ message: 'Bulk rent bill reminders sent successfully.' });
  } catch (error) {
    console.error('Error sending bulk rent reminders:', error);
    res.status(500).json({ error: 'Failed to send bulk rent reminders.' });
  }
});

/**
 * @route POST /api/reminders/water
 * @desc Send water bill reminders for newly created bills
 * @body { onlyNewBills?: boolean, newBillIds?: number[] }
 */
remindersRouter.post('/water', async (req, res) => {
  const { onlyNewBills = false, newBillIds = [] } = req.body;

  try {
    await sendBillReminder('water', { onlyNewBills, newBillIds });
    res.json({
      message: onlyNewBills
        ? 'Water reminders sent for newly created bills.'
        : 'Water reminders sent successfully.',
    });
  } catch (error) {
    console.error('Error sending water reminders:', error);
    res.status(500).json({ error: 'Failed to send water reminders.' });
  }
});

/**
 * @route POST /api/reminders/water/bulk
 * @desc Send bulk water bill reminders for all pending/unpaid bills
 */
remindersRouter.post('/water/bulk', async (req, res) => {
  try {
    await sendBillReminder('water');
    res.json({ message: 'Bulk water bill reminders sent successfully.' });
  } catch (error) {
    console.error('Error sending bulk water reminders:', error);
    res.status(500).json({ error: 'Failed to send bulk water reminders.' });
  }
});

/**
 * @route POST /api/reminders/:billType/:billId
 * @desc Send a reminder for an individual rent or water bill
 */
remindersRouter.post('/:billType/:billId', async (req, res) => {
  const { billType, billId } = req.params;

  if (!['rent', 'water'].includes(billType)) {
    return res.status(400).json({ error: 'Invalid bill type.' });
  }

  try {
    const id = parseInt(billId, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid bill ID.' });
    }

    await sendBillReminder(billType, { onlyNewBills: true, newBillIds: [id] });
    res.json({ message: `Reminder sent for ${billType} bill #${id}` });
  } catch (error) {
    console.error(`Error sending ${billType} reminder for bill ${billId}:`, error);
    res.status(500).json({ error: `Failed to send ${billType} reminder.` });
  }
});

export default remindersRouter;
