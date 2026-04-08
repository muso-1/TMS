import { useQuery } from '@tanstack/react-query'
import { listTenants, listTenantPayments } from '../../api/tenants'
import Table from '../../components/ui/Table'
import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import EditTenantForm from '../../components/forms/EditTenantForm'

export default function Tenants() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants
  })

  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // track tenant being edited
  const [paymentsTenantId, setPaymentsTenantId] = useState(null)
  const [payments, setPayments] = useState([])

  // Filter tenants by search query 
  const filtered = tenants.filter(t =>
    [t.name, t.email, t.phone].join(' ').toLowerCase().includes(q.toLowerCase())
  )

  // Fetch payments for a tenant when requested
  const fetchPayments = async (tenantId) => {
    setPaymentsTenantId(tenantId)
    try {
      const data = await listTenantPayments(tenantId)
      setPayments(data)
    } catch (err) {
      console.error('Error fetching tenant payments:', err)
      setPayments([])
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'totalPaid',
      header: 'Total Paid',
      cell: t => <span>{t.totalPaid?.toFixed(2) ?? 0}</span>
    },
    {
      key: 'balance',
      header: 'Balance',
      cell: t => <span>{t.balance?.toFixed(2) ?? 0}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: tenant => (
        <div className="space-x-2">
          <button
            className="text-blue-500 underline"
            onClick={() => setEditing(tenant)}
          >
            Edit
          </button>
          <button
            className="text-green-500 underline"
            onClick={() => fetchPayments(tenant.id)}
          >
            View Payments
          </button>
        </div>
      )
    }
  ]

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search tenants…"
        className="border rounded px-3 py-2"
      />

      <Table columns={columns} data={filtered} />

      <Modal
        title="Edit Tenant"
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <EditTenantForm
            tenant={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        title="Tenant Payments"
        open={!!paymentsTenantId}
        onClose={() => {
          setPaymentsTenantId(null)
          setPayments([])
        }}
      >
        {payments.length === 0 ? (
          <div>No payments found</div>
        ) : (
          <Table
            columns={[
              { key: 'id', header: 'ID' },
              { key: 'amount', header: 'Amount' },
              { key: 'paidAt', header: 'Paid At', cell: p => new Date(p.paidAt).toLocaleDateString() },
              { key: 'method', header: 'Method' },
              { key: 'reference', header: 'Reference' },
              { key: 'note', header: 'Note' },
            ]}
            data={payments}
          />
        )}
      </Modal>
    </div>
  )
}
