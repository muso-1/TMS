import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createRentBill } from '../../api/rentBills'
import { listTenants } from '../../api/tenants'
import toast from 'react-hot-toast'

export default function RentBillForm({ onClose }) {
  const qc = useQueryClient()
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })
  const { register, handleSubmit } = useForm()
  const { mutate, isLoading } = useMutation({
    mutationFn: createRentBill,
    onSuccess: () => { toast.success('Rent bill created'); qc.invalidateQueries({ queryKey: ['rent-bills'] }); onClose?.() },
    onError: () => toast.error('Failed to create rent bill')
  })

  return (
    <form onSubmit={handleSubmit(d=>mutate({
      tenantId: Number(d.tenantId),
      amount: Number(d.amount),
      dueDate: d.dueDate
    }))} className="space-y-3">
      <select className="w-full border p-2 rounded" {...register('tenantId',{required:true})}>
        <option value="">Select tenant</option>
        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input type="number" className="w-full border p-2 rounded" placeholder="Amount" {...register('amount',{required:true})} />
      <input type="date" className="w-full border p-2 rounded" {...register('dueDate',{required:true})} />
      <button disabled={isLoading} className="bg-black text-white px-4 py-2 rounded">{isLoading?'Saving…':'Save'}</button>
    </form>
  )
}
