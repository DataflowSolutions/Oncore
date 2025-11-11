import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getShowTeam, getAvailablePeople } from '@/lib/actions/show-team'
import { getCachedShow, getCachedOrg } from '@/lib/cache'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; showId: string }> }
) {
  try {
    const { org: orgSlug, showId } = await params
    
    // Verify authentication
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parallelize org and show fetching
    const [{ data: org, error: orgError }, { data: show, error: showError }] = await Promise.all([
      getCachedOrg(orgSlug),
      getCachedShow(showId)
    ])
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (showError) {
      return NextResponse.json({ error: showError.message }, { status: 500 })
    }

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // CRITICAL: Validate tenant boundary - show must belong to the org in the URL
    if (show.org_id !== org.id) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // OPTIMIZED: Parallelize team and available people queries
    const [assignedTeam, availablePeople] = await Promise.all([
      getShowTeam(showId),
      getAvailablePeople(org.id)
    ])

    // Return unified envelope matching SSR shape
    return NextResponse.json({ assignedTeam, availablePeople })
  } catch (error) {
    logger.error('Error fetching show team', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
