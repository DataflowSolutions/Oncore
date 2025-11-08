/**
 * Supabase Environment Configuration
 * 
 * Centralized configuration for all Supabase clients.
 * This ensures consistent environment variable usage across the app.
 */

import { logger } from '../logger'

/**
 * Get server-side Supabase configuration
 * Uses non-public environment variables (server-only)
 */
export function getServerConfig() {
  console.log('[CONFIG] getServerConfig() called')
  console.log('[CONFIG] process.env.PROD_DB =', JSON.stringify(process.env.PROD_DB))
  console.log('[CONFIG] typeof process.env.PROD_DB =', typeof process.env.PROD_DB)
  
  const isProduction = process.env.PROD_DB === 'true'
  
  console.log('[CONFIG] isProduction =', isProduction)
  console.log('[CONFIG] Environment variables check:')
  console.log('  - PROD_SUPABASE_URL exists:', !!process.env.PROD_SUPABASE_URL)
  console.log('  - PROD_SUPABASE_URL value:', process.env.PROD_SUPABASE_URL)
  console.log('  - PROD_SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.PROD_SUPABASE_SERVICE_ROLE_KEY)
  console.log('  - PROD_SUPABASE_SERVICE_ROLE_KEY length:', process.env.PROD_SUPABASE_SERVICE_ROLE_KEY?.length)
  console.log('  - PROD_SUPABASE_SERVICE_ROLE_KEY first 50:', process.env.PROD_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50))
  console.log('  - LOCAL_SUPABASE_URL exists:', !!process.env.LOCAL_SUPABASE_URL)
  console.log('  - LOCAL_SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY)

  // Debug: Log what we're checking
  logger.info('getServerConfig called', {
    PROD_DB: process.env.PROD_DB,
    isProduction,
    hasProdUrl: !!process.env.PROD_SUPABASE_URL,
    hasLocalUrl: !!process.env.LOCAL_SUPABASE_URL,
    hasProdServiceKey: !!process.env.PROD_SUPABASE_SERVICE_ROLE_KEY,
    hasLocalServiceKey: !!process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY
  })

  const url = isProduction
    ? process.env.PROD_SUPABASE_URL!
    : process.env.LOCAL_SUPABASE_URL!

  const anonKey = isProduction
    ? process.env.PROD_SUPABASE_ANON_KEY!
    : process.env.LOCAL_SUPABASE_ANON_KEY!

  const serviceRoleKey = isProduction
    ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!
    : process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!

  console.log('[CONFIG] Selected configuration:')
  console.log('  - url:', url)
  console.log('  - serviceRoleKey length:', serviceRoleKey?.length)
  console.log('  - serviceRoleKey first 50:', serviceRoleKey?.substring(0, 50))

  return {
    url,
    anonKey,
    serviceRoleKey,
    isProduction,
  }
}

/**
 * Get client-side Supabase configuration
 * Uses NEXT_PUBLIC_ environment variables (safe for browser)
 */
export function getClientConfig() {
  const isProduction = process.env.NEXT_PUBLIC_PROD_DB === 'true'

  const url = isProduction
    ? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!

  const anonKey = isProduction
    ? process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!
    : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!

  return {
    url,
    anonKey,
    isProduction,
  }
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(
  config: { url?: string; anonKey?: string; serviceRoleKey?: string },
  context: 'client' | 'server' | 'admin'
) {
  const missing: string[] = []

  if (!config.url) missing.push('Supabase URL')
  if (!config.anonKey) missing.push('Supabase Anon Key')
  if (context === 'admin' && !config.serviceRoleKey) {
    missing.push('Supabase Service Role Key')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase configuration for ${context}:\n` +
      missing.map(m => `  - ${m}`).join('\n') +
      `\n\nCheck your .env.local file and ensure all required variables are set.`
    )
  }
}
