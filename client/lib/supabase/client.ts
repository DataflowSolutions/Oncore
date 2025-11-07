import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'
import { logger } from '../logger'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) {
    return client
  }

  // Environment-based configuration (client uses NEXT_PUBLIC vars)
  const isProduction = process.env.NEXT_PUBLIC_PROD_DB === 'true'

  const supabaseUrl = isProduction
    ? process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!

  const supabaseAnonKey = isProduction
    ? process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!
    : process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY!

  // Log configuration in development
  logger.debug('Supabase Client Config', {
    isProduction,
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing Supabase environment variables!\n` +
      `Mode: ${isProduction ? 'production' : 'local'}\n` +
      `URL present: ${!!supabaseUrl}\n` +
      `Anon Key present: ${!!supabaseAnonKey}\n` +
      `Check your .env.local file.`
    )
  }

  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )

  return client
}