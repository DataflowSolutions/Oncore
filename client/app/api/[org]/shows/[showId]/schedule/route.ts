import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedShowSchedule } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string; showId: string }> }
) {
  try {
    const { showId } = await params
    
    // Verify authentication
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch schedule
    const { data: schedule, error } = await getCachedShowSchedule(showId)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(schedule || [])
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
