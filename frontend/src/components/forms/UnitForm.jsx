import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUnit } from '../../api/units'
import toast from 'react-hot-toast'

export default function UnitForm({ onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm()
  const { mutate, isLoading } = useMutation({
    mutationFn: createUnit,
    onSuccess: () => { toast.success('Unit created'); qc.invalidateQueries({ queryKey: ['units'] }); onClose?.() },
    onError: () => toast.error('Failed to create unit')
  })

  return (
    <form onSubmit={handleSubmit(d=>mutate({ unitNumber: d.unitNumber, tenantId: d.tenantId ? Number(d.tenantId) : null }))} className="space-y-3">
      <input className="w-full border p-2 rounded" placeholder="Unit Number" {...register('unitNumber', { required: true })} />
      <input className="w-full border p-2 rounded" placeholder="Tenant ID (optional)" {...register('tenantId')} />
      <button disabled={isLoading} className="bg-black text-white px-4 py-2 rounded">{isLoading?'Saving…':'Save'}</button>
    </form>
  )
}
