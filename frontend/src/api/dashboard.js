import { api } from './client'

export async function getDashboardSummary(params = {}) {
  const { data } = await api.get('/api/dashboard/summary', { params })
  return data
}
