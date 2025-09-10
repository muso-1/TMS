import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRentBill, updateRentBill } from '../../api/rentBills'

export default function RentBillForm({ onClose, bill }) {
  const queryClient = useQueryClient()
  const [tenantId, setTenantId] = useState(bill?.tenantId || '')
  const [amount, setAmount] = useState(bill?.amount || '')
  const [dueDate, setDueDate] = useState(bill?.dueDate ? new Date(bill.dueDate).toISOString().slice(0,10) : '')

  const mutation = useMutation({
    mutationFn: bill ? (data)=>updateRentBill(bill.id, data) : createRentBill,
    onSuccess: () => {
      queryClient.invalidateQueries(['rent-bills'])
      onClose()
    }
  })

  const handleSubmit = e => {
    e.preventDefault()
    mutation.mutate({ tenantId, amount, dueDate })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block">Tenant ID</label>
        <input type="number" value={tenantId} onChange={e=>setTenantId(e.target.value)} className="border px-2 py-1 w-full" required />
      </div>
      <div>
        <label className="block">Amount</label>
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} className="border px-2 py-1 w-full" required />
      </div>
      <div>
        <label className="block">Due Date</label>
        <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="border px-2 py-1 w-full" required />
      </div>
      <div className="flex justify-end space-x-2">
        <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
        <button type="submit" className="bg-black text-white px-3 py-1 rounded">{bill ? 'Update' : 'Create'}</button>
      </div>
    </form>
  )
}
