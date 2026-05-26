import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { voidRentBill } from '../../api/rentBills'
import toast from 'react-hot-toast'

export default function VoidRentBillForm({
  bill,
  onClose,
}) {
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
  } = useForm()

  const { mutate, isLoading } = useMutation({
    mutationFn: (data) =>
      voidRentBill(bill.id, data),

    onSuccess: () => {
      toast.success('Rent bill voided')

      qc.invalidateQueries(['rent-bills'])

      onClose?.()
    },

    onError: (err) => {
      toast.error(err.message)
    },
  })

  const onSubmit = (data) => {
    mutate({
      reason: data.reason,
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <div className="text-sm text-gray-600">
        You are voiding this rent bill.
        This action cannot be undone.
      </div>

      <textarea
        className="w-full border p-2 rounded"
        rows={4}
        placeholder="Reason for voiding"
        {...register('reason', {
          required: 'Reason is required',
        })}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        {isLoading
          ? 'Voiding...'
          : 'Void Bill'}
      </button>
    </form>
  )
}