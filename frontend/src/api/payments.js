import { api } from './client'

// List payments (optionally filtered by tenant or bill)
export const listPayments = ({
  tenantId,
  rentBillId,
  waterBillId,
  search,
  includeReversed,
  from,
  to,
  page = 1,
  pageSize = 50,
} = {}) =>
  api
    .get('/api/payments', {
      params: {
        tenantId,
        rentBillId,
        waterBillId,
        search,
        includeReversed,
        from,
        to,
        page,
        pageSize,
      },
    })
    .then(r => r.data)

// Create payment
// Supports rent bill, water bill, or tenant-wide allocation
export const createPayment = async ({
  tenantId,
  rentBillId,
  waterBillId,
  amount,
  paidAt,
  method,
  reference,
  note
}) => {
  if (!tenantId) {
    // Optional helper: auto-derive tenantId if rentBillId or waterBillId provided
    if (rentBillId) {
      const bill = await api.get(`/api/rentBills/${rentBillId}`).then(r => r.data)
      tenantId = bill?.lease?.tenant?.id
    } else if (waterBillId) {
      const bill = await api.get(`/api/waterBills/${waterBillId}`).then(r => r.data)
      tenantId = bill?.tenantId
    }
    if (!tenantId) throw new Error('Unable to determine tenant for payment')
  }

  return api
    .post('/api/payments', {
      tenantId,
      rentBillId,
      waterBillId,
      amount,
      paidAt,
      method,
      reference,
      note
    })
    .then(r => r.data)
}

// Update payment
export const updatePayment = (id, data) =>
  api.patch(`/api/payments/${id}`, data).then(r => r.data)

// Reverse payment
export const reversePayment = (id) =>
  api.patch(`/api/payments/${id}/reverse`).then(r => r.data)
