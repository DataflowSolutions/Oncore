import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'

import { getSupabaseServer } from '@/lib/supabase/server'

import { AdvancingSessionsCard } from './components/AdvancingSessionsCard'
import { CollaborationCard } from './components/CollaborationCard'
import { CollaboratorsCard } from './components/CollaboratorsCard'
import { CrewAssignmentsCard } from './components/CrewAssignmentsCard'
import { ScheduleCard } from './components/ScheduleCard'
import { ShowDetailHeader } from './components/ShowDetailHeader'
import { ShowNotesCard } from './components/ShowNotesCard'
import { ShowOverviewCard } from './components/ShowOverviewCard'
import { loadShowDetail } from './queries'

interface ShowDetailPageProps {
  params: { org: string; showId: string }
}

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  noStore()

  const supabase = await getSupabaseServer()
  const detail = await loadShowDetail({
    supabase,
    orgSlug: params.org,
    showId: params.showId,
  })

  if (!detail) {
    notFound()
  }

  const { org, show, scheduleItems, assignments, advancingSessions, collaborators, contacts } = detail

  return (
    <div className="mb-16 mt-4 space-y-6">
      <ShowDetailHeader orgSlug={params.org} show={show} />

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <ShowOverviewCard show={show} contacts={contacts} />
        <CollaborationCard orgId={org.id} showId={show.id} orgSlug={params.org} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScheduleCard items={scheduleItems} />
        <CrewAssignmentsCard assignments={assignments} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdvancingSessionsCard sessions={advancingSessions} orgSlug={params.org} />
        <CollaboratorsCard collaborators={collaborators} />
      </div>

      {show.notes && <ShowNotesCard notes={show.notes} />}
    </div>
  )
}
