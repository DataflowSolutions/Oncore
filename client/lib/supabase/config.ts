/**
 * Supabase Environment Configuration
 * 
 * Centralized configuration for all Supabase clients.
 * This ensures consistent environment variable usage across the app.
 */

import { validateServerEnv, validateClientEnv } from '../env-validation'

/**
 * Get server-side Supabase configuration
 * Uses non-public environment variables (server-only)
 */
export function getServerConfig() {
  // Validate environment on first access
  validateServerEnv()

  const isProduction = process.env.PROD_DB === 'true'

  const url = isProduction
    ? process.env.PROD_SUPABASE_URL!
    : process.env.LOCAL_SUPABASE_URL!

  const anonKey = isProduction
    ? process.env.PROD_SUPABASE_ANON_KEY!
    : process.env.LOCAL_SUPABASE_ANON_KEY!

  const serviceRoleKey = isProduction
    ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!
    : process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!

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
  // Validate environment on first access
  validateClientEnv()

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
