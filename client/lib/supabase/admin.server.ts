/**
 * Supabase Admin Client - SERVER-ONLY
 * 
 * This module provides access to Supabase with service role privileges.
 * It MUST NEVER be imported from client-side code.
 * 
 * The service role key bypasses Row Level Security (RLS) and has full
 * database access. Use with extreme caution and only when necessary.
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { getServerConfig, validateConfig } from './config'

// Ensure this code only runs on the server
if (typeof window !== 'undefined') {
  throw new Error(
    'Admin client cannot be used in browser context! ' +
    'This is a critical security violation.'
  )
}

/**
 * Admin client with service role privileges (memoized singleton)
 * 
 * WARNING: This client bypasses all Row Level Security policies.
 * Only use for:
 * - Admin operations that require elevated privileges
 * - Background jobs and cron tasks
 * - Server-side only operations
 * 
 * NEVER:
 * - Import this in client components
 * - Export this to browser code
 * - Use for regular user operations
 */
let adminClient: ReturnType<typeof createClient<Database>> | undefined

export function getSupabaseAdmin() {
  // Additional runtime check
  if (typeof window !== 'undefined') {
    throw new Error('Admin client accessed from browser!')
  }

  if (!adminClient) {
    const config = getServerConfig()
    validateConfig(config, 'admin')

    adminClient = createClient<Database>(
      config.url,
      config.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  return adminClient
}
