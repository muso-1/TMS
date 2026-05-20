// AssignTenantForm.jsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignTenantToUnit } from '../../api/units'
import { useState } from 'react'

export default function AssignTenantForm({ tenants, units, onClose }) {
  const [tenantId, setTenantId] = useState('')
  const [unitId, setUnitId] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    // unitId should be the first argument, tenantId the second
    mutationFn: () =>
      assignTenantToUnit(
        parseInt(unitId),
        tenantId ? parseInt(tenantId) : null
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // Unit is always required
    if (!unitId) return

    // tenantId may be empty if you want to unassign
    mutation.mutate()
  }

  // Show only vacant units when assigning a tenant.
  // If no tenant is selected (for unassigning), show all occupied units.
  const availableUnits = tenantId
    ? units.filter(u => !u.tenantId)      // assigning -> vacant units only
    : units.filter(u => u.tenantId)       // unassigning -> occupied units only

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Select Tenant</label>
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="border rounded w-full p-2"
        >
          {/* Empty value means unassign tenant */}
          <option value="">-- no tenant (unassign) --</option>

          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">
          {tenantId ? 'Select Vacant Unit' : 'Select Occupied Unit'}
        </label>

        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="border rounded w-full p-2"
        >
          <option value="">-- choose unit --</option>

          {availableUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unitNumber || u.name || `Unit ${u.id}`}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-black px-3 py-2 rounded"
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? 'Saving...'
          : tenantId
            ? 'Assign Tenant'
            : 'Unassign Tenant'}
      </button>
    </form>
  )
}