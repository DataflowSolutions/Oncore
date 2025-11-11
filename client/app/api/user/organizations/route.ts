import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.error('Auth error in /api/user/organizations', { error: authError?.message })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.debug('Fetching organizations for user', { userId: user.id })

    // Use RPC function to bypass RLS issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .rpc('get_user_organizations')

    if (error) {
      logger.error('RPC error fetching organizations', { 
        error: error.message, 
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: user.id 
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.debug('Organizations fetched successfully', { count: data?.length || 0 })
    return NextResponse.json(data || [])
  } catch (error) {
    logger.error('Unexpected error in /api/user/organizations', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
