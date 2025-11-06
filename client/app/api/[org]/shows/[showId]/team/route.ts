import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getShowTeam } from '@/lib/actions/show-team'

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

    // Fetch team
    const team = await getShowTeam(showId)

    return NextResponse.json(team || [])
  } catch (error) {
    console.error('Error fetching show team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
