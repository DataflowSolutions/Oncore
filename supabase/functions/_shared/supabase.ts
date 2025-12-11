import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

/**
 * Create Supabase client with service role key (for admin operations)
 * Use this for operations that need to bypass RLS
 */
export const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Create Supabase client with user auth (respects RLS)
 * Use this for operations that should respect Row Level Security
 */
export const getSupabaseWithAuth = (authHeader: string) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  return supabaseClient
}

/**
 * Verify that a request has a valid auth header by checking with the user's session
 * Returns the user if authenticated, null otherwise
 */
export const verifyAuth = async (authHeader: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const supabase = getSupabaseWithAuth(authHeader)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}
