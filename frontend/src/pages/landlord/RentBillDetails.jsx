import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getRentBill } from '../../api/rentBills'
import { formatDate, formatMoney } from '../../components/utils/format'
import Payments from './Payments'

export default function RentBillDetails() {
  const { id } = useParams()
  const rentBillId = Number(id)

  const { data: bill, isLoading } = useQuery({
    queryKey: ['rent-bill', rentBillId],
    queryFn: () => getRentBill(rentBillId),
  })

  if (isLoading) return <div>Loading…</div>
  if (!bill) return <div>Rent bill not found</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Rent Bill #{bill.id}</h1>
      <div className="p-4 bg-white rounded shadow">
        <p><strong>Tenant:</strong> {bill.tenant?.name ?? bill.tenantId}</p>
        <p><strong>Amount:</strong> {formatMoney(bill.amount)}</p>
        <p><strong>Due Date:</strong> {formatDate(bill.dueDate)}</p>
        <p><strong>Status:</strong> {bill.paid ? 'Paid' : (bill.status || 'Pending')}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Payments</h2>
        <Payments rentBillId={rentBillId} />
      </div>
    </div>
  )
}
