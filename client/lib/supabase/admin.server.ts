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
  console.log('[ADMIN CLIENT] getSupabaseAdmin() called')
  
  // Additional runtime check
  if (typeof window !== 'undefined') {
    console.log('[ADMIN CLIENT] ERROR: Called from browser context!')
    throw new Error('Admin client accessed from browser!')
  }

  if (!adminClient) {
    console.log('[ADMIN CLIENT] No cached client, creating new one...')
    
    const config = getServerConfig()
    
    console.log('[ADMIN CLIENT] Config retrieved:')
    console.log('  - isProduction:', config.isProduction)
    console.log('  - hasUrl:', !!config.url)
    console.log('  - hasServiceRoleKey:', !!config.serviceRoleKey)
    console.log('  - urlLength:', config.url?.length)
    console.log('  - keyLength:', config.serviceRoleKey?.length)
    console.log('  - urlPrefix:', config.url?.substring(0, 40))
    console.log('  - keyPrefix:', config.serviceRoleKey?.substring(0, 40))
    console.log('  - keyContainsService:', config.serviceRoleKey?.includes('service_role'))
    console.log('  - keyContainsAnon:', config.serviceRoleKey?.includes('anon'))
    
    // Debug logging for production issues
    logger.info('Admin Client Environment Check', {
      isProduction: config.isProduction,
      hasUrl: !!config.url,
      hasServiceRoleKey: !!config.serviceRoleKey,
      urlLength: config.url?.length,
      keyLength: config.serviceRoleKey?.length,
      urlPrefix: config.url?.substring(0, 30),
      keyPrefix: config.serviceRoleKey?.substring(0, 30),
      keyContainsService: config.serviceRoleKey?.includes('service_role'),
      keyContainsAnon: config.serviceRoleKey?.includes('anon')
    })
    
    console.log('[ADMIN CLIENT] Validating config...')
    validateConfig(config, 'admin')
    console.log('[ADMIN CLIENT] Config validated successfully')

    logger.info('Creating admin client with service role key')
    
    console.log('[ADMIN CLIENT] Creating Supabase client with:')
    console.log('  - URL:', config.url)
    console.log('  - Key (first 50 chars):', config.serviceRoleKey?.substring(0, 50))
    
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
    
    console.log('[ADMIN CLIENT] Client created successfully')
    console.log('[ADMIN CLIENT] Client type:', typeof adminClient)
    logger.info('Admin client created successfully')
  } else {
    console.log('[ADMIN CLIENT] Returning cached client')
  }

  return adminClient
}
