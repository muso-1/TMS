import { api } from './client'
export const listUnits   = () => api.get('/api/units').then(r => r.data)
export const createUnit  = (data) => api.post('/api/units', data).then(r => r.data)
