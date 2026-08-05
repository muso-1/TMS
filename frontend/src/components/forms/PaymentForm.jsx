import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment, updatePayment } from '../../api/payments'
import { listTenants } from '../../api/tenants'

export default function PaymentForm({
  payment = null,
  onClose
}) {
  const queryClient = useQueryClient()

  const isEditing = Boolean(payment)

  const [tenantId, setTenantId] = useState(payment?.tenantId || '')
  const [amount, setAmount] = useState(payment?.amount || '')
  const [paidAt, setPaidAt] = useState(
    payment?.paidAt
      ? payment.paidAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )
  const [method, setMethod] = useState(payment?.method || '')
  const [reference, setReference] = useState(payment?.reference || '')
  const [note, setNote] = useState(payment?.note || '')

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
    enabled: !isEditing
  })

  const mutation = useMutation({
    mutationFn: (payload) => {
      if (isEditing) {
        return updatePayment(payment.id, payload)
      }

      return createPayment(payload)
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      onClose()
    },

    onError: (error) => {
      console.error(
        `❌ Payment ${isEditing ? 'update' : 'creation'} failed:`,
        error
      )
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    if (isEditing) {
      mutation.mutate({
        paidAt,
        method,
        reference,
        note
      })

      return
    }

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

      {/* Tenant */}
      <div>
        <label className="block mb-1">Tenant</label>

        {isEditing ? (
          <input
            type="text"
            value={payment?.tenant?.name || ''}
            disabled
            className="border px-2 py-1 w-full bg-gray-100 text-gray-600"
          />
        ) : tenantsLoading ? (
          <div>Loading tenants...</div>
        ) : (
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="border px-2 py-1 w-full"
            required
          >
            <option value="">Select tenant</option>

            {tenants.map((tenant) => (
              <option
                key={tenant.id}
                value={tenant.id}
              >
                {tenant.name} ({tenant.email})
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
          disabled={isEditing}
          required
          className={`border px-2 py-1 w-full ${
            isEditing
              ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
              : ''
          }`}
        />

        {isEditing && (
          <p className="text-xs text-gray-500 mt-1">
            Amount cannot be edited. Reverse the payment and create a new one if
            the amount is incorrect.
          </p>
        )}
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

      {/* Payment Method */}
      <div>
        <label className="block mb-1">Payment Method</label>

        <input
          type="text"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          placeholder="Cash, M-Pesa, Bank Transfer"
          className="border px-2 py-1 w-full"
        />
      </div>

      {/* Reference */}
      <div>
        <label className="block mb-1">Reference</label>

        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Transaction ID or Cheque Number"
          className="border px-2 py-1 w-full"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block mb-1">Note</label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="border px-2 py-1 w-full"
          placeholder="Optional notes"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 border rounded"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-black text-white px-3 py-1 rounded disabled:opacity-50"
        >
          {mutation.isPending
            ? 'Saving...'
            : isEditing
              ? 'Update Payment'
              : 'Record Payment'}
        </button>
      </div>
    </form>
  )
}