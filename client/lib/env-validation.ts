/**
 * Runtime Environment Variable Validation
 * 
 * Validates required environment variables at application boot.
 * Prevents deployment of misconfigured applications.
 */

import { z } from 'zod'

/**
 * Server-side environment variables schema
 * These are NOT exposed to the client
 */
const serverEnvSchema = z.object({
  // Environment switcher
  PROD_DB: z.enum(['true', 'false']).optional().default('false'),

  // Production Supabase (server-side)
  PROD_DATABASE_URL: z.string().url().optional(),
  PROD_SUPABASE_URL: z.string().url().optional(),
  PROD_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PROD_SUPABASE_ANON_KEY: z.string().optional(),

  // Local Supabase (server-side)
  LOCAL_DATABASE_URL: z.string().url().optional(),
  LOCAL_SUPABASE_URL: z.string().url().optional(),
  LOCAL_SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  LOCAL_SUPABASE_ANON_KEY: z.string().optional(),

  // CI/CD
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
  // Environment switcher (client)
  NEXT_PUBLIC_PROD_DB: z.enum(['true', 'false']).optional().default('false'),

  // Production Supabase (client-side)
  NEXT_PUBLIC_PROD_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY: z.string().optional(),

  // Local Supabase (client-side)
  NEXT_PUBLIC_LOCAL_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY: z.string().optional(),
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

  const isProduction = parsed.data.PROD_DB === 'true'

  // Validate that required variables are present based on environment
  if (isProduction) {
    const requiredProdVars = [
      'PROD_SUPABASE_URL',
      'PROD_SUPABASE_SERVICE_ROLE_KEY',
      'PROD_SUPABASE_ANON_KEY',
    ] as const

    const missing = requiredProdVars.filter(
      (key) => !parsed.data[key]
    )

    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nCheck your .env.local file.`
      )
    }
  } else {
    const requiredLocalVars = [
      'LOCAL_SUPABASE_URL',
      'LOCAL_SUPABASE_SERVICE_ROLE_KEY',
      'LOCAL_SUPABASE_ANON_KEY',
    ] as const

    const missing = requiredLocalVars.filter(
      (key) => !parsed.data[key]
    )

    if (missing.length > 0) {
      throw new Error(
        `Missing required local environment variables:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nMake sure your local Supabase instance is running.`
      )
    }
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
    throw new Error('Invalid client environment configuration')
  }

  const isProduction = parsed.data.NEXT_PUBLIC_PROD_DB === 'true'

  // Validate that required variables are present based on environment
  if (isProduction) {
    const requiredProdVars = [
      'NEXT_PUBLIC_PROD_SUPABASE_URL',
      'NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY',
    ] as const

    const missing = requiredProdVars.filter(
      (key) => !parsed.data[key]
    )

    if (missing.length > 0) {
      throw new Error(
        `Missing required production client environment variables:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nCheck your .env.local file.`
      )
    }
  } else {
    const requiredLocalVars = [
      'NEXT_PUBLIC_LOCAL_SUPABASE_URL',
      'NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY',
    ] as const

    const missing = requiredLocalVars.filter(
      (key) => !parsed.data[key]
    )

    if (missing.length > 0) {
      throw new Error(
        `Missing required local client environment variables:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nMake sure your local Supabase instance is running.`
      )
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
    'postgres://',
    'DATABASE_URL',
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
