import { api } from './client'

export const listTenants = () => api.get('/api/tenants').then(r => r.data)
export const createTenant = (data) => api.post('/api/tenants', data).then(r => r.data)
export const updateTenant = (id, data) => api.put(`/api/tenants/${id}`, data).then(r => r.data)
