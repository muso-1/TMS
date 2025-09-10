import { api } from './client'
export const listRentBills   = () => api.get('/api/rentBills').then(r => r.data)
export const createRentBill  = (data) => api.post('/api/rentBills', data).then(r => r.data)

// Update a rent bill
export const updateRentBill = (id, data) =>
  api.put(`/api/rentBills/${id}`, data).then(r => r.data)

// Delete a rent bill
export const deleteRentBill = (id) =>
  api.delete(`/api/rentBills/${id}`).then(r => r.data)

// Get a single rent bill by ID
export const getRentBill = (id) =>
  api.get(`/api/rentBills/${id}`).then(r => r.data)