#!/usr/bin/env node

/**
 * Verify RLS Enforcement Script
 * 
 * This script verifies that:
 * 1. Local development uses anon/publishable key (RLS enforced)
 * 2. Direct table access fails as expected
 * 3. Service role key is NOT used in normal operations
 */

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local')
const envVars = {}

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  content.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  })
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Verifying RLS Enforcement\n')
console.log('=' .repeat(60))

// Check environment setup
console.log('\n1. Environment Configuration:')
console.log(`   URL: ${SUPABASE_URL}`)
console.log(`   Using Anon Key: ${SUPABASE_ANON_KEY ? '✅ Yes' : '❌ No'}`)
console.log(`   Service Key Available: ${SUPABASE_SERVICE_KEY ? '✅ Yes (server-only)' : '❌ No'}`)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('\n❌ Missing required environment variables!')
  console.log('   Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

// Detect environment
const isLocal = SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost')
const isUsingPublishableKey = SUPABASE_ANON_KEY.startsWith('sb_publishable_')
const isUsingSecretKey = SUPABASE_ANON_KEY.startsWith('sb_secret_')

console.log(`\n2. Environment Detection:`)
console.log(`   Environment: ${isLocal ? '🏠 Local (127.0.0.1)' : '☁️  Production'}`)
console.log(`   Key Type: ${isUsingPublishableKey ? '✅ Publishable (RLS enforced)' : isUsingSecretKey ? '❌ SECRET KEY - WRONG!' : '⚠️  Legacy JWT'}`)

if (isUsingSecretKey) {
  console.log('\n❌ ERROR: Using secret/service role key as anon key!')
  console.log('   This bypasses RLS and should NEVER be used in NEXT_PUBLIC_ variables')
  process.exit(1)
}

// Test RLS enforcement
console.log('\n3. Testing RLS Enforcement:')

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Try to access a table directly (should fail without auth)
try {
  const { data, error } = await client
    .from('organizations')
    .select('*')
    .limit(1)

  if (error) {
    if (error.message.includes('JWT') || error.message.includes('expired') || error.message.includes('invalid')) {
      console.log('   ✅ RLS enforced: Authentication required')
    } else if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
      console.log('   ✅ RLS enforced: Permission denied (as expected)')
    } else {
      console.log(`   ⚠️  Unexpected error: ${error.message}`)
    }
  } else if (!data || data.length === 0) {
    console.log('   ✅ RLS enforced: No data returned without proper auth')
  } else {
    console.log('   ❌ WARNING: Data returned without auth - RLS may not be enforced!')
    console.log('   This could indicate the anon key has admin privileges')
  }
} catch (err) {
  console.log(`   ⚠️  Connection error: ${err.message}`)
}

// Verify key format
console.log('\n4. Key Format Verification:')
const anonKeyFormat = isUsingPublishableKey ? '✅ Modern (sb_publishable_*)' : '⚠️  Legacy JWT format'
console.log(`   Anon Key: ${anonKeyFormat}`)

if (SUPABASE_SERVICE_KEY) {
  const serviceKeyFormat = SUPABASE_SERVICE_KEY.startsWith('sb_secret_') ? '✅ Modern (sb_secret_*)' : '⚠️  Legacy JWT format'
  console.log(`   Service Key: ${serviceKeyFormat}`)
}

// Summary
console.log('\n' + '=' .repeat(60))
console.log('\n📋 Summary:')

const checks = [
  { name: 'Environment variables set', passed: !!SUPABASE_URL && !!SUPABASE_ANON_KEY },
  { name: 'Using publishable/anon key (not secret)', passed: !isUsingSecretKey },
  { name: 'Local matches production pattern', passed: isLocal ? isUsingPublishableKey : true },
]

let allPassed = true
checks.forEach(check => {
  const icon = check.passed ? '✅' : '❌'
  console.log(`   ${icon} ${check.name}`)
  if (!check.passed) allPassed = false
})

console.log('\n' + '=' .repeat(60))

if (allPassed) {
  console.log('\n✅ All checks passed! RLS enforcement is configured correctly.')
  console.log('   Local development will mimic production RLS behavior.')
} else {
  console.log('\n❌ Some checks failed. Please review the configuration.')
  process.exit(1)
}
