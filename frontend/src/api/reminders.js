import { api } from './client'

/**
 * Send a reminder for a specific bill (either rent or water).
 * @param {'rent' | 'water'} billType - Type of the bill.
 * @param {number} billId - ID of the bill to send reminder for.
 * @returns {Promise<Object>} Response message.
 */
export const sendReminder = (billType, billId) =>
  api.post(`/api/reminders/${billType}/${billId}`).then(r => r.data)

/**
 * Send reminders for newly created bills (pass specific bill IDs).
 * @param {'rent' | 'water'} billType - Type of the bills.
 * @param {number[]} newBillIds - Array of newly created bill IDs.
 * @returns {Promise<Object>} Response message.
 */
export const sendRemindersForNew = (billType, newBillIds = []) =>
  api.post(`/api/reminders/${billType}`, { onlyNewBills: true, newBillIds }).then(r => r.data)

/**
 * Send bulk reminders for all pending or overdue bills.
 * This triggers reminders for all unpaid bills of the given type.
 * @param {'rent' | 'water'} billType - Type of bills.
 * @returns {Promise<Object>} Response message.
 */
export const sendBulkReminders = (billType) =>
  api.post(`/api/reminders/${billType}/bulk`).then(r => r.data)
