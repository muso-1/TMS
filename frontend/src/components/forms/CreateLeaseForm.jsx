import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLease } from '../../api/leases'
import { useState } from 'react'

export default function CreateLeaseForm({ onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    tenantId: '',
    unitId: '',
    startDate: '',
    endDate: '',
    rentAmount: ''
  })

  const mutation = useMutation({
    mutationFn: createLease,
    onSuccess: () => {
      queryClient.invalidateQueries(['leases'])
      onClose()
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      tenantId: Number(form.tenantId),
      unitId: Number(form.unitId),
      rentAmount: Number(form.rentAmount)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="tenantId"
        value={form.tenantId}
        onChange={handleChange}
        placeholder="Tenant ID"
        className="border rounded w-full px-3 py-2"
        required
      />
      <input
        name="unitId"
        value={form.unitId}
        onChange={handleChange}
        placeholder="Unit ID"
        className="border rounded w-full px-3 py-2"
        required
      />
      <input
        name="startDate"
        type="date"
        value={form.startDate}
        onChange={handleChange}
        className="border rounded w-full px-3 py-2"
        required
      />
      <input
        name="endDate"
        type="date"
        value={form.endDate}
        onChange={handleChange}
        className="border rounded w-full px-3 py-2"
      />
      <input
        name="rentAmount"
        type="number"
        step="0.01"
        value={form.rentAmount}
        onChange={handleChange}
        placeholder="Rent Amount"
        className="border rounded w-full px-3 py-2"
        required
      />

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
          disabled={mutation.isLoading}
          className="bg-blue-600 text-black px-4 py-2 rounded"
        >
          {mutation.isLoading ? 'Saving…' : 'Save'}
        </button>
      </div>

      {mutation.error && (
        <div className="text-red-600 text-sm">
          {mutation.error.message}
        </div>
      )}
    </form>
  )
}
