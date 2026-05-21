import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createRentBill, updateRentBill } from '../../api/rentBills'
import { listTenants } from '../../api/tenants'
import { listLeases } from '../../api/leases'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function RentBillForm({ onClose, bill }) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch } = useForm()

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
  })

  // -----------------------------
  // For CREATE: select tenant → load their leases
  // -----------------------------
  const selectedTenantId = watch('tenantId')
  const { data: leases = [] } = useQuery({
    queryKey: ['leases', selectedTenantId],
    queryFn: () => listLeases(selectedTenantId),
    enabled: !!selectedTenantId,
  })

  // -----------------------------
  // Mutation
  // -----------------------------
  const { mutate, isLoading } = useMutation({
    mutationFn: bill
      ? (data) => updateRentBill(bill.id, data)
      : createRentBill,

    onSuccess: () => {
      toast.success(bill ? 'Rent bill updated' : 'Rent bill created')
      qc.invalidateQueries(['rent-bills'])
      onClose?.()
    },
    onError: () => toast.error('Something went wrong'),
  })

  // -----------------------------
  // Submit handler
  // -----------------------------
  const onSubmit = (d) => {
    if (bill) {
      // UPDATE MODE
      mutate({
        amount: Number(d.amount),
        dueDate: d.dueDate,
      })
    } else {
      // CREATE MODE — requires leaseId + dueDate
      mutate({
        leaseId: Number(d.leaseId),
        dueDate: d.dueDate,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

      {!bill && (
        <>
          {/* Tenant Select */}
          <select
            className="w-full border p-2 rounded"
            {...register('tenantId', { required: true })}
          >
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Lease Select (auto-populated after selecting tenant) */}
          <select
            className="w-full border p-2 rounded"
            {...register('leaseId', { required: true })}
            disabled={!selectedTenantId}
          >
            <option value="">Select lease</option>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>
                {l.tenant?.name} — KES {l.monthlyRent}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Amount only editable when updating */}
      {bill && (
        <input
          type="number"
          className="w-full border p-2 rounded"
          placeholder="Amount"
          defaultValue={bill.amount}
          {...register('amount', { required: true })}
        />
      )}

      <input
        type="date"
        className="w-full border p-2 rounded"
        defaultValue={
          bill?.dueDate
            ? new Date(bill.dueDate).toISOString().slice(0, 10)
            : ''
        }
        {...register('dueDate', { required: true })}
      />

      <button
        disabled={isLoading}
        className="bg-black text-black px-4 py-2 rounded"
      >
        {isLoading ? 'Saving…' : bill ? 'Update' : 'Save'}
      </button>
    </form>
  )
}
