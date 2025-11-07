import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedShowSchedule, getCachedShow, getCachedOrg } from '@/lib/cache'
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

    // Get org to validate tenant boundary
    const { data: org, error: orgError } = await getCachedOrg(orgSlug)
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get show to validate it belongs to the org
    const { data: show, error: showError } = await getCachedShow(showId)
    
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

    // Fetch schedule
    const { data: schedule, error } = await getCachedShowSchedule(showId)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(schedule || [])
  } catch (error) {
    logger.error('Error fetching schedule', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
