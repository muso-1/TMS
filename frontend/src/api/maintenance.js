import { api } from './client'
export const listMaintenance    = () => api.get('/api/maintenance').then(r => r.data)
export const createMaintenance  = (data) => api.post('/api/maintenance', data).then(r => r.data)
