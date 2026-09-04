// ============================================================
// StreetRise — public corrections (migration 057)
// ============================================================
//
// Generalized across every category, not housing-only. A closed food pantry
// and a closed transitional house are the same report, so there is one table
// and one submit path.

import { supabase } from '@/lib/supabase'

export type ReportType = 'closed' | 'wrong_info' | 'scam' | 'unsafe' | 'new_listing'

export interface ResourceReportInput {
  resourceId: string | null
  reportType: ReportType
  message: string
  contactEmail?: string | null
}

/**
 * File a correction.
 *
 * **Never add `.select()` to this insert.** `anon` holds INSERT but no SELECT
 * on `resource_reports` (migration 057 §5) — deliberately, because a report
 * can name a scam landlord and carries the reporter's email. PostgREST returns
 * an empty body when the caller cannot read the row back, so asking for it
 * turns a successful write into an error the user sees as failure.
 */
export async function submitResourceReport(input: ResourceReportInput): Promise<void> {
  const { error } = await (supabase as unknown as {
    from: (t: string) => { insert: (v: Record<string, unknown>) => Promise<{ error: Error | null }> }
  })
    .from('resource_reports')
    .insert({
      resource_id: input.resourceId,
      report_type: input.reportType,
      message: input.message.trim(),
      contact_email: input.contactEmail?.trim() || null,
    })

  if (error) throw error
}
