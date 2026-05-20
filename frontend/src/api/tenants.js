import { api } from './client'

// Existing tenant APIs 
export const listTenants = () => api.get('/api/tenants').then(r => r.data)
export const createTenant = (data) => api.post('/api/tenants', data).then(r => r.data)
export const updateTenant = (id, data) => api.patch(`/api/tenants/${id}`, data).then(r => r.data)

// NEW: Fetch all payments for a tenant
export const listTenantPayments = (tenantId) =>
  api.get(`/api/tenants/${tenantId}/payments`).then(r => r.data)