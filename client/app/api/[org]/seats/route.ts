import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedOrg, getCachedAvailableSeats } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org: string }> }
) {
  try {
    const { org: orgSlug } = await params
    
    // Verify authentication
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get org and verify access
    const { data: org, error: orgError } = await getCachedOrg(orgSlug)
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch seat info
    const seatInfo = await getCachedAvailableSeats(org.id)

    return NextResponse.json(seatInfo)
  } catch (error) {
    console.error('Error fetching seat info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
