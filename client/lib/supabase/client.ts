import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";
import { getClientConfig, validateConfig } from "./config";

// Memoized client instance (singleton pattern)
let client: any = null;

/**
 * Create or return the singleton browser Supabase client
 *
 * This client is safe to use in client components and uses
 * NEXT_PUBLIC_ environment variables only.
 */
export function createClient(): any {
  if (client) {
    return client;
  }

  const config = getClientConfig();
  validateConfig(config, "client");

  client = createBrowserClient<Database>(config.url!, config.anonKey!) as any;

  return client;
}
