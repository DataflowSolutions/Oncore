import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'
import { getClientConfig, validateConfig } from './config'

// Memoized client instance (singleton pattern)
let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Create or return the singleton browser Supabase client
 * 
 * This client is safe to use in client components and uses
 * NEXT_PUBLIC_ environment variables only.
 */
export function createClient() {
  if (client) {
    return client
  }

  const config = getClientConfig()
  validateConfig(config, 'client')

  client = createBrowserClient<Database>(
    config.url,
    config.anonKey
  )

  return client
}