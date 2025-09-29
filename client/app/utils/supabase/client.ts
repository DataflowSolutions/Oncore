
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

// Environment-based configuration
const isProduction = process.env.NEXT_PUBLIC_PROD_DB === 'true'

const supabaseUrl = isProduction
  ? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!
  : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!

const supabaseAnonKey = isProduction
  ? process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!
  : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
