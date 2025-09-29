/**
 * This file contains TypeScript declarations for Supabase Edge Functions.
 * Edge Functions run in Deno environment, not Node.js.
 * These declarations help suppress TypeScript errors in VS Code.
 */

declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

// Deno HTTP server types
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

// Supabase client types
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string
  ): {
    auth: {
      getUser(token?: string): Promise<{ data: { user: unknown }, error: unknown }>;
    };
    rpc(fn: string, params?: Record<string, unknown>): Promise<{ data: unknown, error: unknown }>;
    storage: {
      from(bucket: string): {
        upload(path: string, file: File, options?: Record<string, unknown>): Promise<{ error: unknown }>;
      };
    };
  };
}

export {};