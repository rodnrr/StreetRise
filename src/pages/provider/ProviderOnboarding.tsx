import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, CheckCircle } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuthStore, useToast } from '@/lib/store'
import { currentIdentity, SIGNED_OUT_MESSAGE } from '@/lib/claims'

const schema = z.object({
  organization_name: z.string().min(2, 'Organization name required'),
  contact_name:      z.string().min(2, 'Contact name required'),
  contact_email:     z.string().email('Valid email required'),
  contact_phone:     z.string().optional(),
  website:           z.string().url('Must be a valid URL').optional().or(z.literal('')),
  ein:               z.string().optional(),
  bio:               z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

const STEPS = ['Organization Info', 'Contact Details', 'Review & Submit']

export default function ProviderOnboarding() {
  const [step, setStep]           = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const { userId, setAuth, clearAuth } = useAuthStore()
  const toast                     = useToast()
  const navigate                  = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } =
    useForm<FormData>({ resolver: zodResolver(schema), mode: 'onBlur' })

  async function onSubmit(data: FormData) {
    // The persisted auth store outlives the Supabase session it describes, so
    // `userId` alone is not proof we can write. Without this the INSERT goes
    // out as `anon` and the user gets "new row violates row-level security
    // policy for table providers" — same failure the claim form used to have.
    const me = await currentIdentity()
    if (!me) {
      toast.error('Please sign in again', SIGNED_OUT_MESSAGE)
      if (userId) clearAuth()
      navigate(`/login?next=${encodeURIComponent('/portal/onboarding')}`)
      return
    }

    const { data: provider, error } = await db.providers().insert({
      user_id:           me.userId,
      organization_name: data.organization_name,
      contact_name:      data.contact_name,
      contact_email:     data.contact_email,
      contact_phone:     data.contact_phone || null,
      website:           data.website || null,
      ein:               data.ein || null,
      bio:               data.bio || null,
    }).select().single()

    if (error) {
      // Raw driver strings are meaningless to a shelter director; map the two
      // failures this form can actually produce and stay generic otherwise.
      const message =
        error.code === '23505'
          ? 'This account already manages an organization. Sign out and use a different email to register another one.'
          : error.code === '42501'
            ? SIGNED_OUT_MESSAGE
            : 'We couldn’t save your application. Please try again in a moment.'
      toast.error('Submission failed', message)
      return
    }

    setAuth({ userId: me.userId, userEmail: data.contact_email, role: 'provider', providerId: provider.id, verificationStatus: 'pending' })
    setSubmitted(true)
  }

  if (submitted) return (
    <div className="max-w-md mx-auto pt-20 text-center px-4">
      <CheckCircle size={56} className="text-success-600 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Application submitted!</h1>
      <p className="text-gray-500 mb-6">
        Our team manually reviews every provider application within 2 business days.
        You'll receive an email at <strong>{useAuthStore.getState().userEmail}</strong> once your account is verified.
      </p>
      <p className="text-sm text-gray-400">You won't be able to access the provider portal until your account is approved.</p>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      {/* Step indicators */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
              ${i <= step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium ml-2 hidden sm:block ${i <= step ? 'text-primary-700' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
            <Building2 size={18} className="text-primary-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Provider Onboarding</h1>
            <p className="text-xs text-gray-500">{STEPS[step]}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 0 && (<>
            <div>
              <label className="label">Organization name *</label>
              <input {...register('organization_name')} className={errors.organization_name ? 'input-error' : 'input'} placeholder="City Rescue Mission" />
              {errors.organization_name && <p className="error-text">{errors.organization_name.message}</p>}
            </div>
            <div>
              <label className="label">EIN / Tax ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('ein')} className="input" placeholder="12-3456789" />
            </div>
            <div>
              <label className="label">Website <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('website')} className={errors.website ? 'input-error' : 'input'} placeholder="https://yourorg.org" />
              {errors.website && <p className="error-text">{errors.website.message}</p>}
            </div>
            <div>
              <label className="label">About your organization <span className="text-gray-400 font-normal">(max 500 chars)</span></label>
              <textarea {...register('bio')} className="input min-h-[80px] resize-none" placeholder="Brief description of services…" />
            </div>
          </>)}

          {step === 1 && (<>
            <div>
              <label className="label">Contact person *</label>
              <input {...register('contact_name')} className={errors.contact_name ? 'input-error' : 'input'} placeholder="Jane Smith" />
              {errors.contact_name && <p className="error-text">{errors.contact_name.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('contact_email')} type="email" className={errors.contact_email ? 'input-error' : 'input'} placeholder="jane@yourorg.org" />
              {errors.contact_email && <p className="error-text">{errors.contact_email.message}</p>}
            </div>
            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('contact_phone')} type="tel" className="input" placeholder="(213) 555-0100" />
            </div>
          </>)}

          {step === 2 && (
            <div className="space-y-2.5">
              <h3 className="font-semibold text-gray-900 mb-3">Review your information</h3>
              {([
                ['Organization', getValues('organization_name')],
                ['Contact',      getValues('contact_name')],
                ['Email',        getValues('contact_email')],
                ['Phone',        getValues('contact_phone') || '—'],
                ['Website',      getValues('website') || '—'],
                ['EIN',          getValues('ein') || '—'],
              ] as [string,string][]).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%] truncate">{val}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-2">Verification takes up to 2 business days. You'll be emailed when approved.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} className="btn-primary flex-1">Continue</button>
            ) : (
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {isSubmitting ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
