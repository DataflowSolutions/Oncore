/**
 * DEPRECATED: This file is being phased out.
 * 
 * Use instead:
 * - Client-side: import { createClient } from '@/lib/supabase/client'
 * - Server-side: import { createClient } from '@/lib/supabase/server'
 * - Admin operations: import { getSupabaseAdmin } from '@/lib/supabase/admin.server'
 * 
 * This file remains for backward compatibility but should not be used in new code.
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

// Using canonical environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client (deprecated - use createClient from @/lib/supabase/client instead)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// REMOVED: supabaseAdmin export - use getSupabaseAdmin() from @/lib/supabase/admin.server instead
// Admin client has been moved to a server-only module for security

// Database URL for direct connections (server-side only)
export const databaseUrl = process.env.DATABASE_URL!

// Export configuration info
export const config = {
  supabaseUrl,
  databaseUrl,
  projectRef: process.env.SUPABASE_PROJECT_REF
} as const

// Log current environment (for debugging)
logger.debug('Supabase Config initialized', {
  hasUrl: !!supabaseUrl,
  hasProjectRef: !!config.projectRef
})