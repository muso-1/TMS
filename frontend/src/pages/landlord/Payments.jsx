import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listPayments, deletePayment } from '../../api/payments'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import PaymentForm from '../../components/forms/PaymentForm'
import { useState } from 'react'
import { formatDate, formatMoney } from '../../components/utils/format'

export default function Payments() {
  const queryClient = useQueryClient()

  // Filter state
  const [filters, setFilters] = useState({
    tenantId: '',
    rentBillId: '',
    waterBillId: '',
    search: ''
  })

  // Fetch payments with current filters
  const { data, isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: () => listPayments(filters),
  })

  const payments = data?.items ?? []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      await deletePayment(id)
      queryClient.invalidateQueries(['payments'])
    }
  }

  const columns = [
    { key: 'tenant', header: 'Tenant', cell: (p) => p.tenant?.name || '—' },
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

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      {/* Search / Filter Controls */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Search by tenant, reference, or note"
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
          className="border px-2 py-1 rounded w-64"
        />
        <input
          type="number"
          placeholder="Rent Bill ID"
          value={filters.rentBillId}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, rentBillId: e.target.value }))
          }
          className="border px-2 py-1 rounded w-32"
        />
        <input
          type="number"
          placeholder="Water Bill ID"
          value={filters.waterBillId}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, waterBillId: e.target.value }))
          }
          className="border px-2 py-1 rounded w-32"
        />
        <button
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          onClick={() => setFilters({ tenantId: '', rentBillId: '', waterBillId: '', search: '' })}
        >
          Reset
        </button>
      </div>

      {/* Add button */}
      <button
        className="bg-black text-black px-3 py-2 rounded"
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
      >
        Add Payment
      </button>

      {/* Table */}
      <Table columns={columns} data={payments} />

      {/* Modal */}
      <Modal
        title={editing ? 'Edit Payment' : 'Add Payment'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <PaymentForm onClose={() => setOpen(false)} payment={editing} />
      </Modal>
    </div>
  )
}
