import { useQuery } from '@tanstack/react-query'
import { listLeases } from '../../api/leases'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import { useState, useMemo } from 'react'
import CreateLeaseForm from '../../components/forms/CreateLeaseForm'
import EditLeaseForm from '../../components/forms/EditLeaseForm'

export default function Leases() {
  const { data: leases = [], isLoading } = useQuery({
    queryKey: ['leases'],
    queryFn: listLeases,
  })

  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  // filter leases by tenant name or unit
  const filtered = useMemo(() => {
    return leases.filter(l =>
      [
        l.tenant?.name ?? '',
        l.unit?.unitNumber ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }, [leases, search])

  const columns = [
  {
    key: 'tenant',
    header: 'Tenant',
    cell: l => l.tenant?.name || '—'
  },
  {
    key: 'unit',
    header: 'Unit',
    cell: l => l.unit?.unitNumber || '—'
  },
  {
    key: 'startDate',
    header: 'Start Date',
    cell: (l) =>
      l.startDate
        ? new Date(l.startDate).toLocaleDateString()
        : '—'
  },
  {
    key: 'endDate',
    header: 'End Date',
    cell: (l) =>
      l.endDate
        ? new Date(l.endDate).toLocaleDateString()
        : 'Ongoing'
  },
  {
    key: 'monthlyRent',
    header: 'Rent (Ksh)',
    cell: (l) => l.monthlyRent.toLocaleString()
  },
  {
    key: 'actions',
    header: 'Actions',
    cell: (lease) => (
      <button
        className="text-blue-500 underline"
        onClick={() => setEditing(lease)}
      >
        Edit
      </button>
    ),
  }
]

  if (isLoading) return <div>Loading leases…</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by tenant or unit…"
          className="border rounded px-3 py-2 w-1/2"
        />
        <button
          className="bg-blue-600 text-black px-4 py-2 rounded"
          onClick={() => setCreating(true)}
        >
          Create New Lease
        </button>
      </div>

      <Table columns={columns} data={filtered} />

      {/* Create Lease Modal */}
      <Modal
        title="Create New Lease"
        open={creating}
        onClose={() => setCreating(false)}
      >
        <CreateLeaseForm onClose={() => setCreating(false)} />
      </Modal>

      {/* Edit Lease Modal */}
      <Modal
        title="Edit Lease"
        open={!!editing}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <EditLeaseForm
            lease={{
              ...editing,
              tenantId: editing.tenant?.id ?? editing.tenantId,
              unitId: editing.unit?.id ?? editing.unitId,
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
