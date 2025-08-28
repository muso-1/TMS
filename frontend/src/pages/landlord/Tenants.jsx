import { useQuery } from '@tanstack/react-query'
import { listTenants } from '../../api/tenants'
import Table from '../../components/ui/Table'
import { useMemo, useState } from 'react'

export default function Tenants() {
  const { data: tenants = [], isLoading } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })
  const [q, setQ] = useState('')
  const filtered = useMemo(() => tenants.filter(t =>
    [t.name, t.email, t.phone].join(' ').toLowerCase().includes(q.toLowerCase())
  ), [tenants, q])

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
  ]

  if (isLoading) return <div>Loading…</div>
  return (
    <div className="space-y-4">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tenants…" className="border rounded px-3 py-2" />
      <Table columns={columns} data={filtered} />
    </div>
  )
}
