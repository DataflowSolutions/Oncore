/**
 * Environment configuration utility
 * 
 * DEPRECATED: This dual-environment switcher pattern is being phased out.
 * Use canonical environment variables instead (NEXT_PUBLIC_SUPABASE_URL, etc.)
 * 
 * For Supabase clients, use:
 * - import { createClient } from '@/lib/supabase/client' (browser)
 * - import { createClient } from '@/lib/supabase/server' (server with RLS)
 * - import { getSupabaseAdmin } from '@/lib/supabase/admin.server' (admin only)
 */

export const getEnvironmentConfig = () => {
  return {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    project: {
      ref: process.env.SUPABASE_PROJECT_REF,
    }
  }
}

export const validateEnvironmentConfig = () => {
  const config = getEnvironmentConfig()
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(key => {
    const value = key === 'NEXT_PUBLIC_SUPABASE_URL' 
      ? config.supabase.url 
      : config.supabase.anonKey
    return !value
  })
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Check your .env.local file and ensure all required variables are set.\n` +
      `For local dev, run 'supabase start' and copy the keys.`
    )
  }

  return config
}

// Client-side environment info (safe to expose)
export const getClientConfig = () => {
  const config = getEnvironmentConfig()
  return {
    supabaseUrl: config.supabase.url,
    supabaseAnonKey: config.supabase.anonKey,
  }
}