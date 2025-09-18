
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

// Environment-based configuration
const isProduction = process.env.PROD_DB === 'true'

const supabaseUrl = isProduction
  ? process.env.PROD_SUPABASE_URL!
  : process.env.LOCAL_SUPABASE_URL!

const supabaseAnonKey = isProduction
  ? process.env.PROD_SUPABASE_ANON_KEY!
  : process.env.LOCAL_SUPABASE_ANON_KEY!

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Service role client for admin operations (server-side only)
const supabaseServiceRoleKey = isProduction
  ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!
  : process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!

export function createAdminClient() {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
