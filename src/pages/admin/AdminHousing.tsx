// ============================================================
// /admin/housing — manual entry path for the housing directory
// ============================================================
//
// Phase 1 allows either a protected route or bare Supabase Studio for
// data entry. This is a route because the maintainer works from a
// phone, and Studio's table editor on a small screen is not a realistic
// way to publish a listing somebody will act on.
//
// The list shows unpublished organizations first and marks them
// clearly. Unpublished is the normal resting state here, not an error —
// a row waits here until a human has called and confirmed it.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, EyeOff, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/store'
import { ORG_TYPE_LABELS } from '@/lib/housing'
import type { HousingOrganization, HousingLocation } from '@/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const orgs = () => (supabase as any).from('housing_organizations')
/* eslint-enable @typescript-eslint/no-explicit-any */

type OrgRow = HousingOrganization & {
  locations: Pick<HousingLocation, 'city' | 'state_code'>[]
  programs: { id: string; is_published: boolean }[]
}

async function fetchAdminOrgs(): Promise<OrgRow[]> {
  const { data, error } = await orgs()
    .select(`
      *,
      locations:housing_locations ( city, state_code ),
      programs:housing_programs ( id, is_published )
    `)
    .order('name')
  if (error) throw error
  return (data ?? []) as OrgRow[]
}

export default function AdminHousing() {
  const qc = useQueryClient()
  const toast = useToast()
  const [filter, setFilter] = useState<'all' | 'unpublished' | 'published'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-housing-orgs'],
    queryFn: fetchAdminOrgs,
  })

  const togglePublish = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await orgs().update({ is_published: next }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-housing-orgs'] })
      toast.success(vars.next ? 'Organization published' : 'Organization hidden')
    },
    onError: (e: Error) => toast.error('Could not save', e.message),
  })

  const list = (data ?? []).filter((o) =>
    filter === 'all' ? true : filter === 'published' ? o.is_published : !o.is_published
  )

  const unpublishedCount = (data ?? []).filter((o) => !o.is_published).length

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Housing directory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Second-chance housing organizations and programs.{' '}
            {unpublishedCount > 0 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {unpublishedCount} waiting to be verified.
              </span>
            )}
          </p>
        </div>
        <Link to="/admin/housing/new" className="btn-primary btn-sm inline-flex items-center gap-1">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New organization
        </Link>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['all', 'unpublished', 'published'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={
              filter === f
                ? 'btn-primary btn-sm capitalize'
                : 'btn-secondary btn-sm capitalize'
            }
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <p className="mt-8 text-sm text-gray-500 dark:text-slate-400">
          Nothing here yet. Use “New organization” to add one.
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {list.map((o) => {
          const where = Array.from(
            new Set(
              o.locations
                .map((l) => [l.city, l.state_code].filter(Boolean).join(', '))
                .filter(Boolean)
            )
          ).join(' · ')
          const publishedPrograms = o.programs.filter((p) => p.is_published).length

          return (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <Link
                      to={`/admin/housing/${o.id}`}
                      className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white"
                    >
                      {o.name}
                    </Link>
                    <span className={o.is_published ? 'badge badge-verified' : 'badge badge-pending'}>
                      {o.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    {ORG_TYPE_LABELS[o.org_type]}
                    {where && ` · ${where}`}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    {o.programs.length} program{o.programs.length === 1 ? '' : 's'}
                    {o.programs.length > 0 && ` · ${publishedPrograms} published`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => togglePublish.mutate({ id: o.id, next: !o.is_published })}
                  disabled={togglePublish.isPending}
                  className="btn-secondary btn-sm inline-flex items-center gap-1"
                >
                  {o.is_published
                    ? <><EyeOff className="h-4 w-4" aria-hidden="true" />Hide</>
                    : <><Eye className="h-4 w-4" aria-hidden="true" />Publish</>}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>Publishing an organization also reveals its published programs.</strong>{' '}
        Both gates have to be open for a listing to appear on the public site, so hiding the
        organization takes everything under it down in one action.
      </p>
    </div>
  )
}
