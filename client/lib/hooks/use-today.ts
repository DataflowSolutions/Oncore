import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export interface TodayShow {
  id: string
  title: string
  date: string
  doors_at: string | null
  set_time: string | null
  status: string
  venue: {
    id: string
    name: string
    city: string
    state: string
  } | null
}

export interface TodayScheduleItem {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  duration_minutes: number | null
  location: string | null
  notes: string | null
  item_type: string | null
  show_id: string | null
  person_id: string | null
  person: {
    id: string
    name: string
  } | null
  show: {
    id: string
    title: string
    venue: {
      name: string
      city: string
    } | null
  } | null
}

export interface TodayTeamAssignment {
  show_id: string
  duty: string | null
  person: {
    id: string
    name: string
    member_type: string | null
    email: string | null
    phone: string | null
  }
}

export interface TodayData {
  date: string
  shows: TodayShow[]
  scheduleItems: TodayScheduleItem[]
  teamAssignments: TodayTeamAssignment[]
}

export function useToday(orgSlug: string) {
  return useQuery({
    queryKey: queryKeys.today(orgSlug),
    queryFn: async () => {
      const response = await fetch(`/api/${orgSlug}/today`)
      if (!response.ok) {
        throw new Error('Failed to fetch today\'s data')
      }
      return response.json() as Promise<TodayData>
    },
    staleTime: 60 * 1000, // 1 minute - today's data changes frequently
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to keep current
  })
}
