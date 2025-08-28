import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMaintenance } from '../../api/maintenance'
import toast from 'react-hot-toast'

export default function MaintenanceForm({ onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm()
  const { mutate, isLoading } = useMutation({
    mutationFn: createMaintenance,
    onSuccess: () => { toast.success('Maintenance created'); qc.invalidateQueries({ queryKey: ['maintenance'] }); onClose?.() },
    onError: () => toast.error('Failed to create maintenance')
  })

  return (
    <form onSubmit={handleSubmit(d=>mutate({
      tenantId: d.tenantId ? Number(d.tenantId) : null,
      description: d.description,
      cost: d.cost ? Number(d.cost) : 0,
      date: d.date || new Date().toISOString()
    }))} className="space-y-3">
      <input className="w-full border p-2 rounded" placeholder="Tenant ID (optional)" {...register('tenantId')} />
      <input className="w-full border p-2 rounded" placeholder="Description" {...register('description',{required:true})} />
      <input type="number" className="w-full border p-2 rounded" placeholder="Cost" {...register('cost')} />
      <input type="date" className="w-full border p-2 rounded" {...register('date')} />
      <button disabled={isLoading} className="bg-black text-white px-4 py-2 rounded">{isLoading?'Saving…':'Save'}</button>
    </form>
  )
}
