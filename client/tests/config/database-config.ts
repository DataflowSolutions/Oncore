/**
 * Database Configuration for Tests
 * Manages connection to either production or local database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load both .env.local and .env.test
const envLocalPath = path.resolve(__dirname, '../../.env.local')
const envTestPath = path.resolve(__dirname, '../.env.test')

if (fs.existsSync(envLocalPath)) {
  console.log('📄 Loading environment from:', envLocalPath)
  dotenvConfig({ path: envLocalPath, override: false })
} else {
  console.warn('⚠️  .env.local not found at:', envLocalPath)
}

if (fs.existsSync(envTestPath)) {
  console.log('📄 Loading test config from:', envTestPath)
  dotenvConfig({ path: envTestPath, override: false })
} else {
  console.warn('⚠️  .env.test not found at:', envTestPath)
}

export type DatabaseEnvironment = 'production' | 'local'

export interface DatabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey: string
  environment: DatabaseEnvironment
}

export class TestDatabaseManager {
  private static instance: TestDatabaseManager
  private currentEnv: DatabaseEnvironment
  private clients: Map<string, SupabaseClient> = new Map()

  private constructor() {
    // Determine which environment to use from environment variable or .env.test
    let testEnv = process.env.TEST_DB_ENV?.toLowerCase()
    
    // If not set, try to load from .env.test
    if (!testEnv) {
      const envTestPath = path.resolve(__dirname, '../.env.test')
      if (fs.existsSync(envTestPath)) {
        const envContent = fs.readFileSync(envTestPath, 'utf-8')
        const match = envContent.match(/TEST_DB_ENV=(\w+)/)
        if (match) {
          testEnv = match[1].toLowerCase()
        }
      }
    }
    
    if (testEnv === 'production' || testEnv === 'prod') {
      this.currentEnv = 'production'
      console.warn('⚠️  WARNING: Tests will run against PRODUCTION database')
      
      // Safety check
      if (process.env.ALLOW_DESTRUCTIVE_TESTS_ON_PROD !== 'true') {
        console.warn('⚠️  Destructive tests are DISABLED for production')
      }
    } else {
      this.currentEnv = 'local'
      console.log('✅ Tests will run against LOCAL database')
    }
  }

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager()
    }
    return TestDatabaseManager.instance
  }

  getEnvironment(): DatabaseEnvironment {
    return this.currentEnv
  }

  isProduction(): boolean {
    return this.currentEnv === 'production'
  }

  getConfig(): DatabaseConfig {
    if (this.currentEnv === 'production') {
      return {
        url: process.env.NEXT_PUBLIC_PROD_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.NEXT_PUBLIC_PROD_SUPABASE_SERVICE_ROLE_KEY || '',
        environment: 'production'
      }
    } else {
      return {
        url: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321',
        anonKey: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.NEXT_PUBLIC_LOCAL_SUPABASE_SERVICE_ROLE_KEY || '',
        environment: 'local'
      }
    }
  }

  /**
   * Get Supabase client with anon key (for testing as authenticated user)
   */
  getAnonClient(): SupabaseClient {
    if (this.clients.has('anon')) {
      return this.clients.get('anon')!
    }

    const config = this.getConfig()
    const client = createClient(config.url, config.anonKey)
    this.clients.set('anon', client)
    return client
  }

  /**
   * Get Supabase client with service role key (for admin operations)
   */
  getServiceRoleClient(): SupabaseClient {
    if (this.clients.has('service')) {
      return this.clients.get('service')!
    }

    const config = this.getConfig()
    const client = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    this.clients.set('service', client)
    return client
  }

  /**
   * Create a test user and return an authenticated client
   */
  async createTestUser(email?: string, password?: string): Promise<{
    client: SupabaseClient
    user: any
    session: any
  }> {
    const testEmail = email || process.env.TEST_USER_EMAIL || `test-${Date.now()}@example.com`
    const testPassword = password || process.env.TEST_USER_PASSWORD || 'testpassword123'

    const serviceClient = this.getServiceRoleClient()

    // Try to sign in first
    let authResult = await serviceClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    // If user doesn't exist, create them
    if (authResult.error) {
      const createResult = await serviceClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      })

      if (createResult.error) {
        throw new Error(`Failed to create test user: ${createResult.error.message}`)
      }

      // Sign in again
      authResult = await serviceClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      if (authResult.error) {
        throw new Error(`Failed to sign in test user: ${authResult.error.message}`)
      }
    }

    const config = this.getConfig()
    const userClient = createClient(config.url, config.anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authResult.data.session?.access_token}`
        }
      }
    })

    return {
      client: userClient,
      user: authResult.data.user,
      session: authResult.data.session
    }
  }

  /**
   * Clean up test data (only for local environment unless explicitly allowed)
   */
  async cleanup(tables: string[]): Promise<void> {
    if (this.isProduction() && process.env.ALLOW_DESTRUCTIVE_TESTS_ON_PROD !== 'true') {
      console.warn('⚠️  Skipping cleanup on production database')
      return
    }

    const client = this.getServiceRoleClient()

    for (const table of tables) {
      const { error } = await client
        .from(table)
        .delete()
        .like('id', '%test%')

      if (error) {
        console.warn(`Warning: Failed to cleanup ${table}: ${error.message}`)
      }
    }
  }

  /**
   * Print configuration summary
   */
  printConfig(): void {
    const config = this.getConfig()
    console.log('\n' + '='.repeat(70))
    console.log('🔧 Test Database Configuration')
    console.log('='.repeat(70))
    console.log(`Environment: ${this.currentEnv.toUpperCase()}`)
    console.log(`URL: ${config.url}`)
    console.log(`Has Anon Key: ${config.anonKey ? '✅' : '❌'}`)
    console.log(`Has Service Key: ${config.serviceRoleKey ? '✅' : '❌'}`)
    
    if (this.isProduction()) {
      console.log('⚠️  WARNING: RUNNING AGAINST PRODUCTION DATABASE')
      console.log(`Destructive Tests: ${process.env.ALLOW_DESTRUCTIVE_TESTS_ON_PROD === 'true' ? '🔓 ENABLED' : '🔒 DISABLED'}`)
    }
    
    console.log('='.repeat(70) + '\n')
  }
}

// Export singleton instance
export const dbManager = TestDatabaseManager.getInstance()
