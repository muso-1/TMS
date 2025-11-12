import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment } from '../../api/payments'
import { listTenants } from '../../api/tenants'

export default function PaymentForm({ onClose }) {
  const queryClient = useQueryClient()

  const [tenantId, setTenantId] = useState('')
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')

  // Fetch tenants for dropdown
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants
  })

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      queryClient.invalidateQueries(['tenants'])
      onClose()
    },
    onError: (error) => {
      console.error('❌ Payment creation failed:', error)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      tenantId: Number(tenantId),
      amount: Number(amount),
      paidAt,
      method,
      reference,
      note
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tenant selector */}
      <div>
        <label className="block mb-1">Tenant</label>
        {tenantsLoading ? (
          <div>Loading tenants…</div>
        ) : (
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="border px-2 py-1 w-full"
            required
          >
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block mb-1">Amount</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border px-2 py-1 w-full"
          required
        />
      </div>

      {/* Paid At */}
      <div>
        <label className="block mb-1">Paid At</label>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="border px-2 py-1 w-full"
          required
        />
      </div>

      {/* Method */}
      <div>
        <label className="block mb-1">Payment Method</label>
        <input
          type="text"
          placeholder="e.g. Cash, M-Pesa, Bank Transfer"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="border px-2 py-1 w-full"
        />
      </div>

      {/* Reference */}
      <div>
        <label className="block mb-1">Reference</label>
        <input
          type="text"
          placeholder="Transaction ID or Cheque No."
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="border px-2 py-1 w-full"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block mb-1">Note</label>
        <textarea
          placeholder="Optional notes about the payment"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="border px-2 py-1 w-full"
          rows={2}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 border rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-black text-black px-3 py-1 rounded"
        >
          Record Payment
        </button>
      </div>
    </form>
  )
}
