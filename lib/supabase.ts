import { createClient } from '@supabase/supabase-js'

// Environment-based configuration
const isProduction = process.env.PROD_DB === 'true'

const supabaseUrl = isProduction
  ? process.env.PROD_SUPABASE_URL!
  : process.env.LOCAL_SUPABASE_URL!

const supabaseAnonKey = isProduction
  ? process.env.PROD_SUPABASE_ANON_KEY!
  : process.env.LOCAL_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Service role client (server-side only)
const supabaseServiceRoleKey = isProduction
  ? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!
  : process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database URL for direct connections
export const databaseUrl = isProduction
  ? process.env.PROD_DATABASE_URL!
  : process.env.LOCAL_DATABASE_URL!

// Export configuration info
export const config = {
  isProduction,
  supabaseUrl,
  databaseUrl,
  projectRef: process.env.SUPABASE_PROJECT_REF
} as const

// Log current environment (for debugging)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Supabase Config:', {
    environment: isProduction ? 'production' : 'local',
    url: supabaseUrl,
    projectRef: config.projectRef
  })
}