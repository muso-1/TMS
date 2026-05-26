import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { updateLease } from '../../api/leases'
import { listUnits } from '../../api/units'

export default function EditLeaseForm({ lease, onClose }) {
  const queryClient = useQueryClient()

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: listUnits
  })

  const [form, setForm] = useState({
    startDate: lease.startDate
      ? new Date(lease.startDate).toISOString().split('T')[0]
      : '',
    endDate: lease.endDate
      ? new Date(lease.endDate).toISOString().split('T')[0]
      : '',
    monthlyRent: lease.monthlyRent ?? '',
    status: lease.status ?? 'active',
    unitId: lease.unitId ?? ''
  })

  const [saving, setSaving] = useState(false)

  const handleChange = e => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()

    try {
      setSaving(true)

      await updateLease(lease.id, {
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        monthlyRent: Number(form.monthlyRent),
        status: form.status,
        unitId: Number(form.unitId)
      })

      await queryClient.invalidateQueries({
        queryKey: ['leases']
      })

      await queryClient.invalidateQueries({
        queryKey: ['units']
      })

      setSaving(false)
      onClose()
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* UNIT */}
      <div>
        <label className="block text-sm">Unit</label>

        <select
          name="unitId"
          value={form.unitId}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
          disabled={loadingUnits}
        >
          <option value="">Select Unit</option>

          {units.map(unit => (
            <option key={unit.id} value={unit.id}>
              {unit.unitNumber}
            </option>
          ))}
        </select>
      </div>

      {/* START DATE */}
      <div>
        <label className="block text-sm">Start Date</label>

        <input
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
        />
      </div>

      {/* END DATE */}
      <div>
        <label className="block text-sm">End Date</label>

        <input
          type="date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
        />
      </div>

      {/* RENT */}
      <div>
        <label className="block text-sm">Monthly Rent</label>

        <input
          type="number"
          name="monthlyRent"
          value={form.monthlyRent}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
        />
      </div>

      {/* STATUS */}
      <div>
        <label className="block text-sm">Status</label>

        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="terminated">Terminated</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-500 text-black px-4 py-2 rounded"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}