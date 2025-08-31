import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUnits, createUnit } from '../../api/units'
import { useState } from 'react'

export default function Units() {
  const queryClient = useQueryClient()
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: listUnits,
  })
  const [form, setForm] = useState({ unitNumber: '', status: 'vacant' })

  const mutation = useMutation({
    mutationFn: createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries(['units']) // refresh
      setForm({ unitNumber: '', status: 'vacant' }) // reset form
    },
  })

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  if (isLoading) return <div>Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Units</h1>

      {/* Unit List */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Unit Number</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id} className="border-t">
              <td className="p-2">{unit.id}</td>
              <td className="p-2">{unit.unitNumber}</td>
              <td className="p-2">{unit.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Unit Form */}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <input
          type="text"
          name="unitNumber"
          value={form.unitNumber}
          placeholder="Unit number"
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
    
        <button
          type="submit"
          className="bg-blue-500 text-black px-4 py-2 rounded"
          disabled={mutation.isLoading}
        >
          {mutation.isLoading ? 'Saving…' : 'Add Unit'}
        </button>
      </form>
    </div>
  )
}
