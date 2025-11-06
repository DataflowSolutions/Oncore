import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedShow } from '@/lib/cache'

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

    // Fetch show
    const { data: show, error } = await getCachedShow(showId)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    return NextResponse.json(show)
  } catch (error) {
    console.error('Error fetching show:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
