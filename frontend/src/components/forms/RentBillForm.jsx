import { useForm } from 'react-hook-form'

import {
  useMutation,
  useQueryClient,
  useQuery,
} from '@tanstack/react-query'

import { createRentBill } from '../../api/rentBills'

import { listTenants } from '../../api/tenants'
import { listLeases } from '../../api/leases'

import toast from 'react-hot-toast'

export default function CreateRentBillForm({
  onClose,
}) {
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    reset,
  } = useForm()

  // =====================================
  // TENANTS
  // =====================================
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
  })

  // =====================================
  // LEASES
  // =====================================
  const selectedTenantId =
    watch('tenantId')

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', selectedTenantId],

    queryFn: () =>
      listLeases(selectedTenantId),

    enabled: !!selectedTenantId,
  })

  // =====================================
  // CREATE MUTATION
  // =====================================
  const { mutate, isLoading } =
    useMutation({
      mutationFn: createRentBill,

      onSuccess: () => {
        toast.success(
          'Rent bill created'
        )

        qc.invalidateQueries([
          'rent-bills',
        ])

        reset()

        onClose?.()
      },

      onError: (err) => {
        toast.error(
          err.message ||
            'Failed to create rent bill'
        )
      },
    })

  // =====================================
  // SUBMIT
  // =====================================
  const onSubmit = (data) => {
    mutate({
      leaseId: Number(data.leaseId),
      dueDate: data.dueDate,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >

      {/* ========================== */}
      {/* TENANT */}
      {/* ========================== */}
      <div>
        <label className="block mb-1 text-sm font-medium">
          Tenant
        </label>

        <select
          className="w-full border p-2 rounded"
          {...register('tenantId', {
            required: true,
          })}
        >
          <option value="">
            Select tenant
          </option>

          {tenants.map((tenant) => (
            <option
              key={tenant.id}
              value={tenant.id}
            >
              {tenant.name}
            </option>
          ))}
        </select>
      </div>

      {/* ========================== */}
      {/* LEASE */}
      {/* ========================== */}
      <div>
        <label className="block mb-1 text-sm font-medium">
          Lease
        </label>

        <select
          className="w-full border p-2 rounded"
          {...register('leaseId', {
            required: true,
          })}
          disabled={!selectedTenantId}
        >
          <option value="">
            Select lease
          </option>

          {leases.map((lease) => (
            <option
              key={lease.id}
              value={lease.id}
            >
              {lease.tenant?.name || '—'}
              {' — '}
              Rent:{' '}
              {lease.monthlyRent.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {/* ========================== */}
      {/* DUE DATE */}
      {/* ========================== */}
      <div>
        <label className="block mb-1 text-sm font-medium">
          Due Date
        </label>

        <input
          type="date"
          className="w-full border p-2 rounded"
          {...register('dueDate', {
            required: true,
          })}
        />
      </div>

      {/* ========================== */}
      {/* SUBMIT */}
      {/* ========================== */}
      <button
        type="submit"
        disabled={isLoading}
        className="bg-black text-black px-4 py-2 rounded disabled:opacity-50"
      >
        {isLoading
          ? 'Creating...'
          : 'Create Rent Bill'}
      </button>
    </form>
  )
}