import { useQuery } from '@tanstack/react-query'
import { listTenants, listTenantPayments } from '../../api/tenants'
import Table from '../../components/ui/Table'
import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import EditTenantForm from '../../components/forms/EditTenantForm'
import TenantForm from '../../components/forms/TenantForm'
import { listUnits } from '../../api/units'

export default function Tenants() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: listUnits
  })

  const [open, setOpen] = useState({
    tenant: false,
    unit: false,
    water: false,
    assign: false
  })

  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // track tenant being edited
  const [paymentsTenantId, setPaymentsTenantId] = useState(null)
  const [payments, setPayments] = useState([])

  // Filter tenants by search query 
  const filtered = Array.isArray(tenants) ? tenants.filter(t =>
    [t.name, t.email, t.phone].join(' ').toLowerCase().includes(q.toLowerCase())
  ) : 0

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
      key: 'unitNumber',
      header: 'Unit',
      cell: tenant =>
        tenant.units?.[0]?.unitNumber ?? 'Not Assigned'
    },

    {
      key: 'totalRentBilled',
      header: 'Rent Billed',
      cell: t => (
        <span>
          {t.totalRentBilled?.toFixed(2) ?? '0.00'}
        </span>
      )
    },

    {
      key: 'totalRentPaid',
      header: 'Rent Paid',
      cell: t => (
        <span className="text-green-600">
          {t.totalRentPaid?.toFixed(2) ?? '0.00'}
        </span>
      )
    },

    {
      key: 'outstandingRent',
      header: 'Outstanding Rent',
      cell: t => (
        <span
          className={
            t.outstandingRent > 0
              ? 'text-red-600 font-medium'
              : 'text-green-600'
          }
        >
          {t.outstandingRent?.toFixed(2) ?? '0.00'}
        </span>
      )
    },

    {
      key: 'tenantBalance',
      header: 'Account Balance',
      cell: t => (
        <span>
          {t.balance?.toFixed(2) ?? '0.00'}
        </span>
      )
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

      <div className="flex flex-wrap gap-2">
        <button
          className="text-black px-3 py-2 rounded"
          onClick={() => setOpen(o => ({ ...o, tenant: true }))}
        >
          Add Tenant
        </button>
      </div>
        
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

      <Modal
        title="Add Tenant"
        open={open.tenant}
        onClose={() => setOpen(o => ({ ...o, tenant: false }))}
      >
        <TenantForm onClose={() => setOpen(o => ({ ...o, tenant: false }))} />
      </Modal>

    </div>
  )
}
