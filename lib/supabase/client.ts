import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) {
    return client
  }

  // Environment-based configuration (client uses NEXT_PUBLIC vars)
  const isProduction = process.env.NEXT_PUBLIC_PROD_DB === 'true'

  const supabaseUrl = isProduction
    ? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL!

  const supabaseAnonKey = isProduction
    ? process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!
    : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!

  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )

  return client
}