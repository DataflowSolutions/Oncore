import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const { org: orgSlug } = await params
    const supabase = await getSupabaseServer()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get org by slug
    const { data: org, error: orgError } = await supabase
      .rpc('get_org_by_slug', { p_slug: orgSlug })

    if (orgError || !org) {
      logger.error('Failed to fetch org', { slug: orgSlug, error: orgError })
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const orgId = (org as { id: string }).id

    // Get today's date range (start and end of day in UTC)
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    // Fetch today's shows with venue info
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id,
        title,
        date,
        doors_at,
        set_time,
        status,
        venue:venue_id (
          id,
          name,
          city,
          state
        )
      `)
      .eq('org_id', orgId)
      .gte('date', startOfDay.toISOString())
      .lt('date', endOfDay.toISOString())
      .order('date', { ascending: true })

    if (showsError) {
      logger.error('Failed to fetch shows', { error: showsError })
      return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 })
    }

    // Fetch today's schedule items across all shows
    const { data: scheduleItems, error: scheduleError } = await supabase
      .from('schedule_items')
      .select(`
        id,
        title,
        starts_at,
        ends_at,
        duration_minutes,
        location,
        notes,
        item_type,
        show_id,
        person_id,
        person:person_id (
          id,
          name
        ),
        show:show_id (
          id,
          title,
          venue:venue_id (
            name,
            city
          )
        )
      `)
      .eq('org_id', orgId)
      .gte('starts_at', startOfDay.toISOString())
      .lt('starts_at', endOfDay.toISOString())
      .order('starts_at', { ascending: true })

    if (scheduleError) {
      logger.error('Failed to fetch schedule items', { error: scheduleError })
      return NextResponse.json({ error: 'Failed to fetch schedule items' }, { status: 500 })
    }

    // Fetch team members assigned to today's shows
    const showIds = shows?.map(s => s.id) || []
    let teamAssignments: Array<{
      show_id: string
      duty: string | null
      person: {
        id: string
        name: string
        member_type: string | null
        email: string | null
        phone: string | null
      }
    }> = []
    
    if (showIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('show_assignments')
        .select(`
          show_id,
          duty,
          person:person_id (
            id,
            name,
            member_type,
            email,
            phone
          )
        `)
        .in('show_id', showIds)

      if (!assignmentsError && assignments) {
        teamAssignments = assignments
      }
    }

    return NextResponse.json({
      date: now.toISOString(),
      shows: shows || [],
      scheduleItems: scheduleItems || [],
      teamAssignments: teamAssignments || [],
    })
  } catch (error) {
    logger.error('Error in today API route', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
