import { useQuery } from '@tanstack/react-query'
import { listWaterBills } from '../../api/waterBills'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import WaterBillForm from '../../components/forms/WaterBillForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'

export default function WaterBills() {
  const { data: bills = [], isLoading } = useQuery({ queryKey: ['water-bills'], queryFn: listWaterBills })
  const [open, setOpen] = useState(false)

  const columns = [
    { key: 'tenant', header: 'Tenant', cell: r => r.tenant?.name ?? r.tenantId },
    { key: 'previousReading', header: 'Prev' },
    { key: 'currentReading', header: 'Current' },
    { key: 'usage', header: 'Usage', cell: r => r.usage ?? r.unitsUsed },
    { key: 'amount', header: 'Amount', cell: r => formatMoney(r.amount) },
    { key: 'dueDate', header: 'Due', cell: r => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', cell: r => r.paid ? 'Paid' : (r.status || 'Pending') },
  ]

  if (isLoading) return <div>Loading…</div>
  return (
    <div className="space-y-4">
      <button className="bg-black text-white px-3 py-2 rounded" onClick={()=>setOpen(true)}>Create Water Bill</button>
      <Table columns={columns} data={bills} />
      <Modal title="Create Water Bill" open={open} onClose={()=>setOpen(false)}>
        <WaterBillForm onClose={()=>setOpen(false)} />
      </Modal>
    </div>
  )
}
