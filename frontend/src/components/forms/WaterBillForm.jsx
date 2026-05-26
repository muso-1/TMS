import { useForm } from 'react-hook-form'

import {
  useMutation,
  useQueryClient,
  useQuery,
} from '@tanstack/react-query'

import {
  createWaterBill,
  LatestUnitReading,
} from '../../api/waterBills'

import { listUnits } from '../../api/units'

import toast from 'react-hot-toast'

export default function WaterBillForm({
  onClose,
}) {

  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
  } = useForm()

  // Fetch units
  const { data: units = [] } =
    useQuery({
      queryKey: ['units'],
      queryFn: listUnits,
    })

  // Watch selected unit
  const selectedUnitId =
    watch('unitId')

  // Fetch latest reading + tenant
  const { data: unitData } =
    useQuery({
      queryKey: [
        'unit-reading',
        selectedUnitId,
      ],

      queryFn: () =>
        LatestUnitReading(
          selectedUnitId
        ),

      enabled: !!selectedUnitId,
    })

  const { mutate, isLoading } =
    useMutation({
      mutationFn: createWaterBill,

      onSuccess: () => {
        toast.success(
          'Water bill created'
        )

        qc.invalidateQueries({
          queryKey: ['water-bills'],
        })

        onClose?.()
      },

      onError: () =>
        toast.error(
          'Failed to create water bill'
        ),
    })

  return (
    <form
      onSubmit={handleSubmit((d) =>
        mutate({
          unitId: Number(d.unitId),

          currentReading: Number(
            d.currentReading
          ),

          dueDate: d.dueDate,
        })
      )}

      className="space-y-3"
    >

      {/* Unit */}
      <select
        className="w-full border p-2 rounded"

        {...register('unitId', {
          required: true,
        })}
      >
        <option value="">
          Select unit
        </option>

        {units.map((u) => (
          <option
            key={u.id}
            value={u.id}
          >
            {u.unitNumber}
          </option>
        ))}
      </select>

      {/* Tenant */}
      <input
        type="text"
        readOnly

        value={
          unitData?.tenant?.name ||
          'Vacant'
        }

        className="w-full border p-2 rounded bg-gray-100"

        placeholder="Tenant"
      />

      {/* Previous Reading */}
      <input
        type="number"
        readOnly

        value={
          unitData?.previousReading ??
          ''
        }

        className="w-full border p-2 rounded bg-gray-100"

        placeholder="Previous Reading"
      />

      {/* Current Reading */}
      <input
        type="number"

        className="w-full border p-2 rounded"

        placeholder="Current Reading"

        {...register(
          'currentReading',
          {
            required: true,
          }
        )}
      />

      {/* Due Date */}
      <input
        type="date"

        className="w-full border p-2 rounded"

        {...register('dueDate', {
          required: true,
        })}
      />

      <button
        disabled={isLoading}

        className="bg-black text-black px-4 py-2 rounded"
      >
        {isLoading
          ? 'Saving…'
          : 'Save'}
      </button>
    </form>
  )
}