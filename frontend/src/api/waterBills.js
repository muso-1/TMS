import { api } from './client'
export const listWaterBills   = () => api.get('/api/waterBills').then(r => r.data)
export const createWaterBill  = (data) => api.post('/api/waterBills', data).then(r => r.data)
export async function LatestUnitReading(unitId) {
  const res = await api.get(
    `/api/waterbills/unit/${unitId}/latest-reading`
  )

  return res.data
}// backend auto-computes usage/amount from previous/current reading
export const voidWaterBill = (
  billId,
  reason
) =>
  api.patch(
    `/api/waterBills/${billId}/void`,
    { reason }
  )
  .then((r) => r.data)