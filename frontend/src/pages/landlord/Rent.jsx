import { useQuery } from '@tanstack/react-query'
import { listRentBills } from '../../api/rentBills'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import RentBillForm from '../../components/forms/RentBillForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'

export default function Rent() {
  const { data: bills = [], isLoading } = useQuery({ queryKey: ['rent-bills'], queryFn: listRentBills })
  const [open, setOpen] = useState(false)

  const columns = [
    { key: 'tenant', header: 'Tenant', cell: r => r.tenant?.name ?? r.tenantId },
    { key: 'amount', header: 'Amount', cell: r => formatMoney(r.amount) },
    { key: 'dueDate', header: 'Due', cell: r => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', cell: r => r.paid ? 'Paid' : (r.status || 'Pending') },
  ]

  if (isLoading) return <div>Loading…</div>
  return (
    <div className="space-y-4">
      <button className="bg-black text-white px-3 py-2 rounded" onClick={()=>setOpen(true)}>Create Rent Bill</button>
      <Table columns={columns} data={bills} />
      <Modal title="Create Rent Bill" open={open} onClose={()=>setOpen(false)}>
        <RentBillForm onClose={()=>setOpen(false)} />
      </Modal>
    </div>
  )
}
