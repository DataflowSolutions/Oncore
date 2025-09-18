import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

import { parseVenueContacts } from './utils'
import type {
  AdvancingSession,
  AssignmentRecord,
  CollaboratorRecord,
  OrganizationSummary,
  ScheduleItem,
  ShowDetailData,
  ShowDetailRecord,
} from './types'

type Supabase = SupabaseClient<Database>

interface LoadShowDetailParams {
  supabase: Supabase
  orgSlug: string
  showId: string
}

export async function loadShowDetail({
  supabase,
  orgSlug,
  showId,
}: LoadShowDetailParams): Promise<ShowDetailData | null> {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single<OrganizationSummary>()

  if (!org) {
    return null
  }

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select(
      `
        id,
        title,
        status,
        date,
        doors_at,
        set_time,
        notes,
        artist:artists ( id, name ),
        venue:venues ( id, name, city, country, address, capacity, contacts )
      `,
    )
    .eq('id', showId)
    .eq('org_id', org.id)
    .single<ShowDetailRecord>()

  if (!show || showError) {
    return null
  }

  const [scheduleRes, assignmentsRes, sessionsRes, collaboratorsRes] = await Promise.all([
    supabase
      .from('schedule_items')
      .select('id, title, starts_at, ends_at, location, notes')
      .eq('show_id', show.id)
      .eq('org_id', org.id)
      .order('starts_at', { ascending: true }),
    supabase
      .from('show_assignments')
      .select('duty, person:people ( id, name, role_title, email, phone )')
      .eq('show_id', show.id)
      .order('duty', { ascending: true }),
    supabase
      .from('advancing_sessions')
      .select('id, title, created_at, expires_at')
      .eq('show_id', show.id)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('show_collaborators')
      .select('id, email, role, status, created_at, accepted_at')
      .eq('show_id', show.id)
      .eq('org_id', org.id)
      .order('created_at', { ascending: true }),
  ])

  const scheduleItems = (scheduleRes.data ?? []) as ScheduleItem[]
  const assignments = (assignmentsRes.data ?? []) as AssignmentRecord[]
  const advancingSessions = (sessionsRes.data ?? []) as AdvancingSession[]
  const collaborators = (collaboratorsRes.data ?? []) as CollaboratorRecord[]

  return {
    org,
    show,
    scheduleItems,
    assignments,
    advancingSessions,
    collaborators,
    contacts: parseVenueContacts(show.venue?.contacts ?? null),
  }
}
