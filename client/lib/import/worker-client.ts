import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { getServerConfig, validateConfig } from "../supabase/config";

let serviceClient: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Service role Supabase client for background workers/cron.
 * Uses service key; do not expose to browser contexts.
 */
export function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient;

  const config = getServerConfig();
  validateConfig(config, "admin");

  serviceClient = createClient<Database>(config.url!, config.serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });

  return serviceClient;
}
