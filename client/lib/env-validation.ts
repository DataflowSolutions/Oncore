/**
 * Runtime Environment Variable Validation
 * 
 * Validates required CANONICAL environment variables at application boot.
 * Prevents deployment of misconfigured applications.
 */

import { z } from 'zod'

/**
 * Server-side environment variables schema
 * These are NOT exposed to the client
 */
const serverEnvSchema = z.object({
  // Canonical server variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key required for admin operations'),
  DATABASE_URL: z.string().url().optional(),

  // Project configuration
  SUPABASE_PROJECT_REF: z.string().optional(),
  SUPABASE_ACCESS_TOKEN: z.string().optional(),

  // API Keys
  GEMINI_API_KEY: z.string().optional(),

  // Node environment (automatically set by Next.js)
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

/**
 * Client-side environment variables schema
 * These are safe to expose to the browser (NEXT_PUBLIC_* prefix)
 */
const clientEnvSchema = z.object({
  // Canonical client variables (ONLY these should be used)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Valid Supabase URL required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Anon/publishable key required'),
})

/**
 * Validate server environment variables
 * Call this in server-only contexts (e.g., API routes, server components)
 */
export function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid server environment configuration')
  }

  // Check for canonical client vars on server too
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      `Missing canonical Supabase variables:\n` +
      `  - NEXT_PUBLIC_SUPABASE_URL\n` +
      `  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n` +
      `Check your .env.local file.\n` +
      `For local dev: run 'supabase start' and copy keys from 'supabase status'`
    )
  }

  return parsed.data
}

/**
 * Validate client environment variables
 * Call this in client-side contexts
 */
export function validateClientEnv() {
  const parsed = clientEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    
    const errorMsg = `Missing required client environment variables:\n` +
      Object.entries(parsed.error.flatten().fieldErrors)
        .map(([key, errors]) => `  - ${key}: ${errors?.join(', ')}`)
        .join('\n') +
      `\n\nCheck your .env.local file.\n` +
      `For local dev, these should be:\n` +
      `  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n` +
      `  NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from 'supabase status'>`
    
    console.warn('⚠️', errorMsg)
    
    // Only throw in production builds
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg)
    }
  }

  return parsed.data
}

/**
 * Security check: Ensure no NEXT_PUBLIC_ variables contain secrets
 * This should be called during build/deployment
 */
export function validateNoSecretsInPublicVars() {
  const dangerousPatterns = [
    'service_role',
    'SERVICE_ROLE',
    'sb_secret_',
    'postgres://',
  ]

  const publicVars = Object.entries(process.env)
    .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))

  const violations = publicVars.filter(([, value]) =>
    dangerousPatterns.some(pattern => value?.includes(pattern))
  )

  if (violations.length > 0) {
    console.error('🚨 SECURITY VIOLATION: Secrets found in NEXT_PUBLIC_ variables!')
    violations.forEach(([key, value]) => {
      console.error(`  ${key}: ${value?.substring(0, 50)}...`)
    })
    throw new Error(
      'Security violation: Server secrets found in client-exposed variables!'
    )
  }

  return true
}
