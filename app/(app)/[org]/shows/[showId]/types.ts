import type { Database } from '@/lib/database.types'

export type ShowStatus = Database['public']['Enums']['show_status']

export type OrganizationSummary = Pick<
  Database['public']['Tables']['organizations']['Row'],
  'id' | 'name' | 'slug'
>

export type ShowDetailRecord = Pick<
  Database['public']['Tables']['shows']['Row'],
  'id' | 'title' | 'status' | 'date' | 'doors_at' | 'set_time' | 'notes'
> & {
  artist: Pick<Database['public']['Tables']['artists']['Row'], 'id' | 'name'> | null
  venue: Pick<
    Database['public']['Tables']['venues']['Row'],
    'id' | 'name' | 'city' | 'country' | 'address' | 'capacity' | 'contacts'
  > | null
}

export type ScheduleItem = Pick<
  Database['public']['Tables']['schedule_items']['Row'],
  'id' | 'title' | 'starts_at' | 'ends_at' | 'location' | 'notes'
>

export type AssignmentRecord = Pick<
  Database['public']['Tables']['show_assignments']['Row'],
  'duty'
> & {
  person: Pick<
    Database['public']['Tables']['people']['Row'],
    'id' | 'name' | 'role_title' | 'email' | 'phone'
  > | null
}

export type AdvancingSession = Pick<
  Database['public']['Tables']['advancing_sessions']['Row'],
  'id' | 'title' | 'created_at' | 'expires_at'
>

export type CollaboratorRecord = Pick<
  Database['public']['Tables']['show_collaborators']['Row'],
  'id' | 'email' | 'role' | 'status' | 'created_at' | 'accepted_at'
>

export type VenueContactsValue = Database['public']['Tables']['venues']['Row']['contacts']

export type VenueContact = {
  name?: string
  role?: string
  email?: string
  phone?: string
}

export interface ShowDetailData {
  org: OrganizationSummary
  show: ShowDetailRecord
  scheduleItems: ScheduleItem[]
  assignments: AssignmentRecord[]
  advancingSessions: AdvancingSession[]
  collaborators: CollaboratorRecord[]
  contacts: VenueContact[]
}
