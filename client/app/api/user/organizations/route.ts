import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's organizations
    const { data, error } = await supabase
      .from('org_members')
      .select(`
        role,
        created_at,
        organizations (
          id,
          name,
          slug,
          created_at
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
