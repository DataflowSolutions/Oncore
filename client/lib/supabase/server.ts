import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '../database.types'
import { getServerConfig, validateConfig } from './config'

/**
 * Create a Supabase client for server-side use
 * 
 * This client uses cookies for session management and can be used in:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * - Middleware (via separate helper)
 */
export async function createClient(): Promise<any> {
  const cookieStore = await cookies()
  const config = getServerConfig()
  validateConfig(config, 'server')
  
  return createServerClient<Database>(
    config.url!,
    config.anonKey!,
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
  ) as any
}

// Backward compatibility alias
export const getSupabaseServer = createClient
