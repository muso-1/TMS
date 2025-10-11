import { api } from './client'

export const listLeases = () =>
  api.get('/api/leases').then(r => r.data)

export const getLease = (id) =>
  api.get(`/api/leases/${id}`).then(r => r.data)

export const createLease = (data) =>
  api.post('/api/leases', data).then(r => r.data)

export const updateLease = (id, data) =>
  api.put(`/api/leases/${id}`, data).then(r => r.data)

export const deleteLease = (id) =>
  api.delete(`/api/leases/${id}`).then(r => r.data)
