import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getCachedOrg, getCachedOrgPeopleFull } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')
    
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

    // Fetch people
    const { data: people, error } = await getCachedOrgPeopleFull(org.id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Apply filter if provided
    let filteredPeople = people || []
    if (filter && filter !== 'all') {
      filteredPeople = filteredPeople.filter(person => 
        person.member_type?.toLowerCase() === filter.toLowerCase()
      )
    }

    return NextResponse.json(filteredPeople)
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
