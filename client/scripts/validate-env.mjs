#!/usr/bin/env node
/**
 * Pre-build security validation
 * 
 * This script runs before building the application to ensure:
 * 1. No secrets are exposed in NEXT_PUBLIC_ variables
 * 2. Required environment variables are present
 * 3. Environment configuration is consistent
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local file manually
try {
  const envPath = resolve(__dirname, '../.env.local')
  const envFile = readFileSync(envPath, 'utf8')
  
  // Parse .env file
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '') // Remove quotes
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch {
  console.warn('⚠️  Could not load .env.local file. Using existing environment variables.')
}

console.log('🔒 Running security validation...\n')

/**
 * Check for secrets in NEXT_PUBLIC_ variables
 */
function validateNoSecretsInPublicVars() {
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

/**
 * Validate server environment variables
 */
function validateServerEnv() {
  const isProduction = process.env.PROD_DB === 'true'

  if (isProduction) {
    const requiredProdVars = [
      'PROD_SUPABASE_URL',
      'PROD_SUPABASE_SERVICE_ROLE_KEY',
      'PROD_SUPABASE_ANON_KEY',
    ]

    const missing = requiredProdVars.filter(key => !process.env[key])

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
    ]

    const missing = requiredLocalVars.filter(key => !process.env[key])

    if (missing.length > 0) {
      throw new Error(
        `Missing required local environment variables:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nMake sure your local Supabase instance is running.`
      )
    }
  }
}

/**
 * Validate client environment variables
 */
function validateClientEnv() {
  const isProduction = process.env.NEXT_PUBLIC_PROD_DB === 'true'

  if (isProduction) {
    const requiredProdVars = [
      'NEXT_PUBLIC_PROD_SUPABASE_URL',
      'NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY',
    ]

    const missing = requiredProdVars.filter(key => !process.env[key])

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
    ]

    const missing = requiredLocalVars.filter(key => !process.env[key])

    if (missing.length > 0) {
      throw new Error(
        `Missing required local client environment variables:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nMake sure your local Supabase instance is running.`
      )
    }
  }
}

try {
  // Check for secrets in public variables
  console.log('1. Checking for secrets in NEXT_PUBLIC_ variables...')
  validateNoSecretsInPublicVars()
  console.log('   ✅ No secrets found in public variables\n')

  // Validate server environment
  console.log('2. Validating server environment variables...')
  validateServerEnv()
  console.log('   ✅ Server environment valid\n')

  // Validate client environment
  console.log('3. Validating client environment variables...')
  validateClientEnv()
  console.log('   ✅ Client environment valid\n')

  console.log('✅ All security checks passed!\n')
  process.exit(0)
} catch (error) {
  console.error('\n❌ Security validation failed!')
  console.error(error instanceof Error ? error.message : String(error))
  console.error('\n🚨 Build aborted. Fix the issues above before deploying.\n')
  process.exit(1)
}

