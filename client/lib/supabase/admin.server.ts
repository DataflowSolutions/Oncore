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

// Ensure this code only runs on the server
if (typeof window !== 'undefined') {
  throw new Error(
    'Admin client cannot be used in browser context! ' +
    'This is a critical security violation.'
  )
}

// Environment-based configuration (server-only env vars)
const isProduction = process.env.PROD_DB === 'true'

const supabaseUrl = isProduction
  ? process.env.PROD_SUPABASE_URL!
  : process.env.LOCAL_SUPABASE_URL!

const supabaseServiceRoleKey = isProduction
  ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!
  : process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing required Supabase admin configuration! ' +
    `Mode: ${isProduction ? 'production' : 'local'}\n` +
    `URL present: ${!!supabaseUrl}\n` +
    `Service Role Key present: ${!!supabaseServiceRoleKey}\n` +
    `Check your server-side environment variables.`
  )
}

/**
 * Admin client with service role privileges
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
    adminClient = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
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

// Export configuration info (for debugging)
export const adminConfig = {
  isProduction,
  supabaseUrl,
  hasServiceRoleKey: !!supabaseServiceRoleKey,
} as const

// Note: Removed debug logging to prevent exposing configuration in production
