import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listPayments, deletePayment } from '../../api/payments'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import PaymentForm from '../../components/forms/PaymentForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'

export default function Payments({ rentBillId }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: rentBillId ? ['payments', rentBillId] : ['payments'],
    queryFn: () => listPayments({ rentBillId }),
    enabled: true,
  })

  const payments = data?.items ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      await deletePayment(id)
      queryClient.invalidateQueries(rentBillId ? ['payments', rentBillId] : ['payments'])
    }
  }

  const columns = [
    { key: 'tenant', header: 'Tenant', cell: (p) => p.tenant?.name || '—' },
    { key: 'unit', header: 'Unit', cell: (p) => p.rentBill?.lease?.unit?.unitNumber || '—' },
    { key: 'amount', header: 'Amount', cell: (p) => formatMoney(p.amount) },
    { key: 'paidAt', header: 'Paid At', cell: (p) => formatDate(p.paidAt) },
    { key: 'method', header: 'Method' },
    { key: 'reference', header: 'Reference' },
    { key: 'note', header: 'Note' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (p) => (
        <div className="space-x-2">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => {
              setEditing(p)
              setOpen(true)
            }}
          >
            Edit
          </button>
          <button
            className="text-red-600 hover:underline"
            onClick={() => handleDelete(p.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  const dataWithActions = payments.map((p) => ({
    ...p,
    onEdit: () => {
      setEditing(p)
      setOpen(true)
    },
    onDelete: () => handleDelete(p.id),
  }))

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <button
        className="bg-black text-black px-3 py-2 rounded"
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
      >
        Add Payment
      </button>

      <Table columns={columns} data={dataWithActions} />

      <Modal
        title={editing ? 'Edit Payment' : 'Add Payment'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <PaymentForm
          onClose={() => setOpen(false)}
          payment={editing}
          rentBillId={rentBillId}
        />
      </Modal>
    </div>
  )
}
