import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import type { Provider } from '@/types'

const schema = z.object({
  organization_name:   z.string().min(2),
  contact_name:        z.string().min(2),
  contact_email:       z.string().email(),
  contact_phone:       z.string().optional(),
  website:             z.string().url().optional().or(z.literal('')),
  ein:                 z.string().optional(),
  bio:                 z.string().max(500).optional(),
  verification_status: z.enum(['pending','verified','rejected','suspended']),
  role:                z.enum(['provider','admin','super_admin']),
})

type FormData = z.infer<typeof schema>

export default function AdminProviderEdit() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast    = useToast()
  const qc       = useQueryClient()

  const { data: provider, isLoading } = useQuery<Provider | null>({
    queryKey: ['admin-provider', id],
    queryFn: async () => {
      const { data } = await db.providers().select('*').eq('id', id!).single()
      return data as Provider
    },
    enabled: !!id,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!provider) return
    reset({
      organization_name:   provider.organization_name,
      contact_name:        provider.contact_name,
      contact_email:       provider.contact_email,
      contact_phone:       provider.contact_phone ?? '',
      website:             provider.website ?? '',
      ein:                 provider.ein ?? '',
      bio:                 provider.bio ?? '',
      verification_status: provider.verification_status,
      role:                provider.role as 'provider'|'admin'|'super_admin',
    })
  }, [provider, reset])

  const save = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await db.providers().update({
        organization_name:   data.organization_name,
        contact_name:        data.contact_name,
        contact_email:       data.contact_email,
        contact_phone:       data.contact_phone || null,
        website:             data.website || null,
        ein:                 data.ein || null,
        bio:                 data.bio || null,
        verification_status: data.verification_status,
        role:                data.role,
      }).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Provider updated')
      qc.invalidateQueries({ queryKey: ['admin-providers'] })
      qc.invalidateQueries({ queryKey: ['admin-provider', id] })
      navigate('/admin/providers')
    },
    onError: (e: Error) => toast.error('Save failed', e.message),
  })

  if (isLoading) return <div className="skeleton h-96 w-full" />
  if (!provider)  return <p className="text-gray-400">Provider not found.</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/providers')} className="btn-icon text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Provider</h1>
          <p className="text-sm text-gray-400">{provider.organization_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-5">

        {/* Status & Role — top priority */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Account Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-gray-300">Verification status</label>
              <select {...register('verification_status')} className="input bg-gray-700 border-gray-600 text-white">
                {['pending','verified','rejected','suspended'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Setting to "Verified" grants portal access.</p>
            </div>
            <div>
              <label className="label text-gray-300">Role</label>
              <select {...register('role')} className="input bg-gray-700 border-gray-600 text-white">
                <option value="provider">Provider</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Admin and above can access /admin.</p>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Organization Info</h2>
          <div>
            <label className="label text-gray-300">Organization name *</label>
            <input {...register('organization_name')} className={`input bg-gray-700 border-gray-600 text-white ${errors.organization_name ? 'border-red-500' : ''}`} />
            {errors.organization_name && <p className="error-text">{errors.organization_name.message}</p>}
          </div>
          <div>
            <label className="label text-gray-300">EIN / Tax ID</label>
            <input {...register('ein')} className="input bg-gray-700 border-gray-600 text-white" placeholder="12-3456789" />
          </div>
          <div>
            <label className="label text-gray-300">Website</label>
            <input {...register('website')} className="input bg-gray-700 border-gray-600 text-white" placeholder="https://yourorg.org" />
            {errors.website && <p className="error-text">{errors.website.message}</p>}
          </div>
          <div>
            <label className="label text-gray-300">Bio <span className="text-gray-500">(max 500 chars)</span></label>
            <textarea {...register('bio')} className="input bg-gray-700 border-gray-600 text-white min-h-[80px] resize-none" />
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Contact Person</h2>
          <div>
            <label className="label text-gray-300">Contact name *</label>
            <input {...register('contact_name')} className={`input bg-gray-700 border-gray-600 text-white ${errors.contact_name ? 'border-red-500' : ''}`} />
            {errors.contact_name && <p className="error-text">{errors.contact_name.message}</p>}
          </div>
          <div>
            <label className="label text-gray-300">Email *</label>
            <input {...register('contact_email')} type="email" className={`input bg-gray-700 border-gray-600 text-white ${errors.contact_email ? 'border-red-500' : ''}`} />
            {errors.contact_email && <p className="error-text">{errors.contact_email.message}</p>}
          </div>
          <div>
            <label className="label text-gray-300">Phone</label>
            <input {...register('contact_phone')} type="tel" className="input bg-gray-700 border-gray-600 text-white" placeholder="(813) 555-0100" />
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary flex-1">
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate('/admin/providers')} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
