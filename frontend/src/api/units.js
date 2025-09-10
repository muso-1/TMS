import { api } from './client'
export const listUnits   = () => api.get('/api/units').then(r => r.data)
export const createUnit  = (data) => api.post('/api/units', data).then(r => r.data)
export const updateUnit  = (id, data) => api.put(`/api/units/${id}`, data).then(r => r.data)
export const deleteUnit  = (id) => api.delete(`/api/units/${id}`).then(r => r.data)
export const assignTenantToUnit = (unitId, tenantId) =>
  api.put(`/api/units/${unitId}/assign-tenant`, { tenantId }).then(r => r.data)