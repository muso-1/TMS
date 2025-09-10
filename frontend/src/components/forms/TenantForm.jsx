import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTenant } from '../../api/tenants'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
})

export default function TenantForm({ onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(schema) })
  const { mutate, isLoading } = useMutation({
    mutationFn: createTenant,
    onSuccess: () => { toast.success('Tenant created'); qc.invalidateQueries({ queryKey: ['tenants'] }); reset(); onClose?.() },
    onError: () => toast.error('Failed to create tenant')
  })

  return (
    <form onSubmit={handleSubmit((d)=>mutate(d))} className="space-y-3">
      <input className="w-full border p-2 rounded" placeholder="Name" {...register('name')} />
      {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
      <input className="w-full border p-2 rounded" placeholder="Email" {...register('email')} />
      {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
      <input className="w-full border p-2 rounded" placeholder="Phone" {...register('phone')} />
      {errors.phone && <p className="text-red-600 text-sm">{errors.phone.message}</p>}
      <button disabled={isLoading} className="bg-black text-black px-4 py-2 rounded">{isLoading?'Saving…':'Save'}</button>
    </form>
  )
}
