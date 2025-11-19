import { useQuery } from '@tanstack/react-query'
import { listPayments } from '../../api/payments'
import { formatDate, formatMoney } from '../../components/utils/format'

export default function RentBillPayments({ rentBillId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payments', { rentBillId }],
    queryFn: () => listPayments({ rentBillId }),
    enabled: !!rentBillId,
  })

  const payments = data?.items ?? []

  if (isLoading) return <div>Loading payments…</div>

  if (!payments.length)
    return <div className="text-gray-600">No payments for this rent bill.</div>

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <div
          key={p.id}
          className="p-3 bg-gray-100 rounded border flex justify-between items-center"
        >
          <div>
            <div><strong>Amount:</strong> {formatMoney(p.amount)}</div>
            <div><strong>Date:</strong> {formatDate(p.paidAt)}</div>
            <div><strong>Method:</strong> {p.method || '—'}</div>
            <div><strong>Reference:</strong> {p.reference || '—'}</div>
            <div><strong>Note:</strong> {p.note || '—'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
