import { api } from './client'
export const listWaterBills   = () => api.get('/api/water-bills').then(r => r.data)
export const createWaterBill  = (data) => api.post('/api/water-bills', data).then(r => r.data)
// backend auto-computes usage/amount from previous/current reading
