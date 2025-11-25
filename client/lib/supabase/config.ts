/**
 * Supabase Environment Configuration
 * 
 * Centralized configuration using CANONICAL environment variables.
 * No more switching between PROD_* and LOCAL_* - just one set of variables.
 */

/**
 * Get server-side Supabase configuration
 * Uses non-public environment variables (server-only)
 */
export function getServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return {
    url,
    anonKey,
    serviceRoleKey,
  }
}

/**
 * Get client-side Supabase configuration
 * Uses NEXT_PUBLIC_ environment variables (safe for browser)
 */
export function getClientConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return {
    url,
    anonKey,
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

  if (!config.url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!config.anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (context === 'admin' && !config.serviceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase configuration for ${context}:\n` +
      missing.map(m => `  - ${m}`).join('\n') +
      `\n\nCheck your .env.local file and ensure all required variables are set.\n` +
      `For local dev, run 'supabase start' and copy the keys from 'supabase status'.`
    )
  }
}
