import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateTenant } from '../../api/tenants'

export default function EditTenantForm({ tenant, onClose }) {
  const [form, setForm] = useState({
    name: tenant.name,
    email: tenant.email,
    phone: tenant.phone
  })

  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateTenant(tenant.id, form)
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      onClose()
    } catch (error) {
      console.error('Failed to update tenant:', error)
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border rounded w-full p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          className="border rounded w-full p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Phone</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="border rounded w-full p-2"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-black px-3 py-2 rounded"
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
