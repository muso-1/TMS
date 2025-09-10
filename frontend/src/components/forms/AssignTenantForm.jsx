import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignTenantToUnit } from '../../api/units'
import { useState } from 'react'

export default function AssignTenantForm({ tenants, units, onClose }) {
  const [tenantId, setTenantId] = useState('')
  const [unitId, setUnitId] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => assignTenantToUnit(tenantId, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants'])
      queryClient.invalidateQueries(['units'])
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!tenantId || !unitId) return
    mutation.mutate()
  }

  const vacantUnits = units.filter(u => !u.tenantId)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Select Tenant</label>
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="border rounded w-full p-2"
        >
          <option value="">-- choose tenant --</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Select Unit</label>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="border rounded w-full p-2"
        >
          <option value="">-- choose vacant unit --</option>
          {vacantUnits.map(u => (
            <option key={u.id} value={u.id}>{u.name || `Unit ${u.id}`}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-black px-3 py-2 rounded"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Assigning...' : 'Assign Tenant'}
      </button>
    </form>
  )
}
