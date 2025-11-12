import { api } from './client'

export const listRentBills = () => api.get('/api/rentBills').then(r => r.data)
export const createRentBill = (data) => api.post('/api/rentBills', data).then(r => r.data)
export const updateRentBill = (id, data) => api.put(`/api/rentBills/${id}`, data).then(r => r.data)
export const deleteRentBill = (id) => api.delete(`/api/rentBills/${id}`).then(r => r.data)
export const getRentBill = (id) => api.get(`/api/rentBills/${id}`).then(r => r.data)

// NEW: List all payments for a specific rent bill
export const listRentBillPayments = (rentBillId) =>
  api.get(`/api/payments/bill/${rentBillId}/summary`).then(r => r.data.totals)
