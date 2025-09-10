import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listRentBills, deleteRentBill } from '../../api/rentBills'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import RentBillForm from '../../components/forms/RentBillForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'
import { Link } from 'react-router-dom'

export default function Rent() {
  const queryClient = useQueryClient()
  const { data: bills = [], isLoading } = useQuery({ queryKey: ['rent-bills'], queryFn: listRentBills })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleDelete = async id => {
    if(confirm('Are you sure?')) {
      await deleteRentBill(id)
      queryClient.invalidateQueries(['rent-bills'])
    }
  }

  const columns = [
    { key: 'tenant', header: 'Tenant', cell: r => r.tenant?.name ?? r.tenantId },
    { key: 'amount', header: 'Amount', cell: r => formatMoney(r.amount) },
    { key: 'dueDate', header: 'Due', cell: r => formatDate(r.dueDate) },
    { key: 'status', header: 'Status', cell: r => r.paid ? 'Paid' : (r.status || 'Pending') },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <Link to={`/rent-bills/${r.id}`} className="text-blue-600 hover:underline">
          View
        </Link>
      ),
    },
  ]

  const dataWithActions = bills.map(r => ({ 
    ...r, 
    onEdit: bill => { setEditing(bill); setOpen(true) },
    onDelete: () => handleDelete(r.id)
  }))

  if(isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <button className="bg-black text-black px-3 py-2 rounded" onClick={()=>{setEditing(null); setOpen(true)}}>
        Create Rent Bill
      </button>

      <Table columns={columns} data={dataWithActions} />

      <Modal title={editing ? "Edit Rent Bill" : "Create Rent Bill"} open={open} onClose={()=>setOpen(false)}>
        <RentBillForm onClose={()=>setOpen(false)} bill={editing} />
      </Modal>
    </div>
  )
}
