import { useQuery } from '@tanstack/react-query'
import { listTenants } from '../../api/tenants'
import Table from '../../components/ui/Table'
import { useMemo, useState } from 'react'
import Modal from '../../components/ui/Modal'
import EditTenantForm from '../../components/forms/EditTenantForm'

export default function Tenants() {
  const { data: tenants = [], isLoading } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // track tenant being edited

  const filtered = useMemo(() => tenants.filter(t =>
    [t.name, t.email, t.phone].join(' ').toLowerCase().includes(q.toLowerCase())
  ), [tenants, q])

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (tenant) => (
        <button
          className="text-blue-500 underline"
          onClick={() => setEditing(tenant)}
        >
          Edit
        </button>
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
    </div>
  )
}
