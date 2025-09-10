import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUnit } from '../../api/units'

export default function EditUnitForm({ unit, onClose }) {
  const [form, setForm] = useState({
    unitNumber: unit.unitNumber,
    status: unit.status || 'vacant',
  })

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (payload) => updateUnit(unit.id, payload),
    onSuccess: () => {
      // refresh units list and close the modal
      queryClient.invalidateQueries(['units'])
      onClose()
    },
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Unit Number</label>
        <input
          name="unitNumber"
          value={form.unitNumber}
          onChange={handleChange}
          className="border rounded w-full p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Status</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="border rounded w-full p-2"
        >
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
        </select>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-black px-3 py-2 rounded"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
