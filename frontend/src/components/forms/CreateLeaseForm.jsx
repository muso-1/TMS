import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLease } from '../../api/leases'
import { useState } from 'react'

export default function CreateLeaseForm({ tenants, units, onClose }) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    tenantId: '',
    unitId: '',
    startDate: '',
    endDate: '',
    monthlyRent: ''
  })

  // ONLY vacant units should be selectable
  const vacantUnits = units.filter(u => u.status === 'vacant')

  const mutation = useMutation({
    mutationFn: createLease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      onClose()
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    mutation.mutate({
      tenantId: Number(form.tenantId),
      unitId: Number(form.unitId),
      startDate: form.startDate,
      endDate: form.endDate || null,
      monthlyRent: Number(form.monthlyRent)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Tenant */}
      <div>
        <label className="block text-sm font-medium">Select Tenant</label>
        <select
          name="tenantId"
          value={form.tenantId}
          onChange={handleChange}
          className="border rounded w-full p-2"
          required
        >
          <option value="">-- choose tenant --</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Unit */}
      <div>
        <label className="block text-sm font-medium">Select Vacant Unit</label>
        <select
          name="unitId"
          value={form.unitId}
          onChange={handleChange}
          className="border rounded w-full p-2"
          required
        >
          <option value="">-- choose unit --</option>
          {vacantUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unitNumber || `Unit ${u.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Start Date */}
      <input
        name="startDate"
        type="date"
        value={form.startDate}
        onChange={handleChange}
        className="border rounded w-full px-3 py-2"
        required
      />

      {/* End Date */}
      <input
        name="endDate"
        type="date"
        value={form.endDate}
        onChange={handleChange}
        className="border rounded w-full px-3 py-2"
      />

      {/* Rent */}
      <input
        name="monthlyRent"
        type="number"
        step="0.01"
        value={form.monthlyRent}
        onChange={handleChange}
        placeholder="Monthly Rent"
        className="border rounded w-full px-3 py-2"
        required
      />

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 border rounded"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-black px-4 py-2 rounded"
        >
          {mutation.isPending ? 'Saving…' : 'Create Lease'}
        </button>
      </div>

      {/* Error */}
      {mutation.error && (
        <div className="text-red-600 text-sm">
          {mutation.error.message}
        </div>
      )}
    </form>
  )
}