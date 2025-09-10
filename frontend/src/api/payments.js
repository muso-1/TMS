import { api } from './client'

// List payments (optionally filtered by rentBillId)
export const listPayments = ({ rentBillId, page = 1, pageSize = 50 }) =>
  api
    .get('/api/payments', { params: { rentBillId, page, pageSize } })
    .then(r => r.data)

// Create payment
export const createPayment = (data) =>
  api.post('/api/payments', data).then(r => r.data)

// Update payment
export const updatePayment = (id, data) =>
  api.patch(`/api/payments/${id}`, data).then(r => r.data)

// Delete payment
export const deletePayment = (id) =>
  api.delete(`/api/payments/${id}`).then(r => r.data)
