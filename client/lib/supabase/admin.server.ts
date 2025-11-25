/**
 * Supabase Admin Client - SERVER-ONLY
 * 
 * This module provides access to Supabase with service role privileges.
 * It MUST NEVER be imported from client-side code.
 * 
 * The service role key bypasses Row Level Security (RLS) and has full
 * database access. Use with extreme caution and only when necessary.
 * 
 * APPROVED USE CASES ONLY:
 * - Admin scripts in /scripts folder
 * - Cron jobs and background tasks
 * - Database migrations
 * - Data seeding
 * 
 * NEVER USE IN:
 * - Route handlers (use createClient from server.ts)
 * - Server actions (use createClient from server.ts)
 * - Server components (use createClient from server.ts)
 * - Client components (IMPOSSIBLE - server-only module)
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { getServerConfig, validateConfig } from './config'
import { logger } from '../logger'

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
 * Only use for approved admin operations listed above.
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

    logger.info('Creating admin client', { 
      url: config.url,
      keyPrefix: config.serviceRoleKey?.substring(0, 15) + '...'
    })
    
    adminClient = createClient<Database>(
      config.url!,
      config.serviceRoleKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      }
    )
    
    logger.info('Admin client created successfully')
  }

  return adminClient
}
