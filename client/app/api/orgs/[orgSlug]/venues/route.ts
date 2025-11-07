import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedOrg, getCachedOrgVenues, getCachedOrgVenuesWithCounts } from '@/lib/cache'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params
    const { searchParams } = new URL(request.url)
    const includeCounts = searchParams.get('includeCounts') === 'true'
    
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

    // Fetch venues with or without counts
    if (includeCounts) {
      const { data: venues, error } = await getCachedOrgVenuesWithCounts(org.id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(venues || [])
    } else {
      const { data: venues, error } = await getCachedOrgVenues(org.id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(venues || [])
    }
  } catch (error) {
    logger.error('Error fetching venues', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
