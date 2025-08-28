import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createWaterBill } from '../../api/waterBills'
import { listTenants } from '../../api/tenants'
import toast from 'react-hot-toast'

export default function WaterBillForm({ onClose }) {
  const qc = useQueryClient()
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })
  const { register, handleSubmit } = useForm()
  const { mutate, isLoading } = useMutation({
    mutationFn: createWaterBill,
    onSuccess: () => { toast.success('Water bill created'); qc.invalidateQueries({ queryKey: ['water-bills'] }); onClose?.() },
    onError: () => toast.error('Failed to create water bill')
  })

  return (
    <form onSubmit={handleSubmit(d=>mutate({
      tenantId: Number(d.tenantId),
      currentReading: Number(d.currentReading),
      dueDate: d.dueDate
    }))} className="space-y-3">
      <select className="w-full border p-2 rounded" {...register('tenantId',{required:true})}>
        <option value="">Select tenant</option>
        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input type="number" className="w-full border p-2 rounded" placeholder="Current Reading" {...register('currentReading',{required:true})} />
      <input type="date" className="w-full border p-2 rounded" {...register('dueDate',{required:true})} />
      <button disabled={isLoading} className="bg-black text-white px-4 py-2 rounded">{isLoading?'Saving…':'Save'}</button>
    </form>
  )
}
