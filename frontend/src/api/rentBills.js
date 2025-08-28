import { api } from './client'
export const listRentBills   = () => api.get('/api/rent-bills').then(r => r.data)
export const createRentBill  = (data) => api.post('/api/rent-bills', data).then(r => r.data)
