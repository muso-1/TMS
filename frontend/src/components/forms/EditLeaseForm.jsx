import { useState } from 'react'
import { updateLease } from '../../api/leases'
import { useQueryClient } from '@tanstack/react-query'

export default function EditLeaseForm({ lease, onClose }) {
  const [form, setForm] = useState({
    startDate: lease.startDate
      ? new Date(lease.startDate).toISOString().split('T')[0]
      : '',
    endDate: lease.endDate
      ? new Date(lease.endDate).toISOString().split('T')[0]
      : '',
    monthlyRent: lease.monthlyRent ?? ''
  })
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    await updateLease(lease.id, {
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      monthlyRent: Number(form.monthlyRent)
    })
    await queryClient.invalidateQueries(['leases'])
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
