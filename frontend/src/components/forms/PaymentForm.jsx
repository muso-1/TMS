import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment, updatePayment } from '../../api/payments'
import { listRentBills } from '../../api/rentBills'
import { formatMoney, formatDate } from '../utils/format'

export default function PaymentForm({ onClose, payment }) {
  const queryClient = useQueryClient()

  // controlled state
  const [rentBillId, setRentBillId] = useState(payment?.rentBillId || '')
  const [amount, setAmount] = useState(payment?.amount || '')
  const [paidAt, setPaidAt] = useState(
    payment?.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : ''
  )
  const [method, setMethod] = useState(payment?.method || '')
  const [reference, setReference] = useState(payment?.reference || '')
  const [note, setNote] = useState(payment?.note || '')

  // fetch bills for dropdown
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['rent-bills'],
    queryFn: listRentBills,
  })

  const mutation = useMutation({
    mutationFn: payment
      ? (data) => updatePayment(payment.id, data)
      : createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      queryClient.invalidateQueries(['rent-bills'])
      onClose()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      rentBillId: Number(rentBillId),
      amount: Number(amount),
      paidAt,
      method,
      reference,
      note,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rent Bill selector */}
      <div>
        <label className="block mb-1">Rent Bill</label>
        {billsLoading ? (
          <div>Loading bills…</div>
        ) : (
          <select
            value={rentBillId}
            onChange={(e) => setRentBillId(e.target.value)}
            className="border px-2 py-1 w-full"
            required
          >
            <option value="">Select a bill</option>
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                {b.tenant?.name ?? b.tenantId} — {formatMoney(b.amount)} due {formatDate(b.dueDate)}
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
          placeholder="Transaction ID, Cheque No..."
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
          className="bg-black text-white px-3 py-1 rounded"
        >
          {payment ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}
