import { api } from './client'
export const listWaterBills   = () => api.get('/api/waterBills').then(r => r.data)
export const createWaterBill  = (data) => api.post('/api/waterBills', data).then(r => r.data)
// backend auto-computes usage/amount from previous/current reading
