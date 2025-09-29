import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '../database.types'

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  
  // Environment-based configuration (server uses regular env vars, not NEXT_PUBLIC)
  const isProduction = process.env.PROD_DB === 'true'

  const supabaseUrl = isProduction
    ? process.env.PROD_SUPABASE_URL!
    : process.env.LOCAL_SUPABASE_URL!

  const supabaseAnonKey = isProduction
    ? process.env.PROD_SUPABASE_ANON_KEY!
    : process.env.LOCAL_SUPABASE_ANON_KEY!
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}