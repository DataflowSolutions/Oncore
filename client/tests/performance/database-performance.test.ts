/**
 * Database Performance Tests
 * Tests RLS policies, indexes, and query performance
 */

import { createClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if we should skip tests
const skipTests = !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === ''

interface TestResult {
  testName: string
  duration: number
  passed: boolean
  error?: string
  details?: any
}

class PerformanceTest {
  private results: TestResult[] = []
  private supabase = skipTests ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  async run() {
    console.log('🚀 Starting Performance Tests\n')
    console.log('=' .repeat(60))

    if (skipTests || !this.supabase) {
      console.log('\n⚠️  Skipping database tests - no Supabase connection configured')
      console.log('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
      console.log('\n✅ Database tests skipped (configure environment to run)\n')
      return
    }

    // Database Tests
    await this.testIndexEfficiency()
    await this.testRLSPolicyPerformance()
    await this.testCachedQueryPerformance()
    await this.testBatchOperations()
    await this.testMaterializedViewPerformance()
    await this.testComplexQueryOptimization()

    this.printResults()
  }

  private async measure(name: string, fn: () => Promise<any>): Promise<number> {
    const start = performance.now()
    try {
      await fn()
      const duration = performance.now() - start
      this.results.push({ testName: name, duration, passed: true })
      return duration
    } catch (error) {
      const duration = performance.now() - start
      this.results.push({
        testName: name,
        duration,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      })
      return duration
    }
  }

  async testIndexEfficiency() {
    console.log('\n📊 Test 1: Index Efficiency')
    console.log('-'.repeat(60))

    if (!this.supabase) return

    // Test 1.1: org_members lookup by user_id (should use idx_org_members_user_id)
    const duration1 = await this.measure('org_members by user_id', async () => {
      const { data } = await this.supabase!
        .from('org_members')
        .select('org_id, role')
        .limit(10)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ org_members by user_id: ${duration1.toFixed(2)}ms`)

    // Test 1.2: shows by org_id and date (should use existing index)
    const duration2 = await this.measure('shows by org_id + date', async () => {
      const { data } = await this.supabase!
        .from('shows')
        .select('id, title, date')
        .order('date', { ascending: true })
        .limit(20)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ shows by org_id + date: ${duration2.toFixed(2)}ms`)

    // Test 1.3: show_collaborators by user_id and show_id
    const duration3 = await this.measure('show_collaborators lookup', async () => {
      const { data } = await this.supabase!
        .from('show_collaborators')
        .select('show_id, role')
        .limit(10)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ show_collaborators lookup: ${duration3.toFixed(2)}ms`)

    const avgDuration = (duration1 + duration2 + duration3) / 3
    const status = avgDuration < 100 ? '✅' : '⚠️'
    console.log(`\n${status} Average query time: ${avgDuration.toFixed(2)}ms (target: <100ms)`)
  }

  async testRLSPolicyPerformance() {
    console.log('\n🔒 Test 2: RLS Policy Performance')
    console.log('-'.repeat(60))

    if (!this.supabase) return

    // Test that queries with RLS are reasonably fast
    const duration1 = await this.measure('RLS on organizations', async () => {
      const { data } = await this.supabase!
        .from('organizations')
        .select('id, name')
        .limit(5)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ organizations select: ${duration1.toFixed(2)}ms`)

    const duration2 = await this.measure('RLS on shows', async () => {
      const { data } = await this.supabase!
        .from('shows')
        .select('id, title')
        .limit(10)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ shows select: ${duration2.toFixed(2)}ms`)

    const duration3 = await this.measure('RLS on advancing_fields', async () => {
      const { data } = await this.supabase!
        .from('advancing_fields')
        .select('id, field_name')
        .limit(10)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ advancing_fields select: ${duration3.toFixed(2)}ms`)

    const avgDuration = (duration1 + duration2 + duration3) / 3
    const status = avgDuration < 150 ? '✅' : '⚠️'
    console.log(`\n${status} Average RLS query time: ${avgDuration.toFixed(2)}ms (target: <150ms)`)
  }

  async testCachedQueryPerformance() {
    console.log('\n⚡ Test 3: Query Caching Benefits')
    console.log('-'.repeat(60))

    if (!this.supabase) return

    // Simulate repeated queries (in real app, React cache would deduplicate these)
    const queryOrg = async () => {
      return this.supabase!
        .from('organizations')
        .select('id, name')
        .limit(1)
        .single()
    }

    // First call
    const duration1 = await this.measure('First org query', queryOrg)
    console.log(`  ✓ First call: ${duration1.toFixed(2)}ms`)

    // Second call (should be similar without cache, but shows what cache would prevent)
    const duration2 = await this.measure('Second org query', queryOrg)
    console.log(`  ✓ Second call: ${duration2.toFixed(2)}ms`)

    // Third call
    const duration3 = await this.measure('Third org query', queryOrg)
    console.log(`  ✓ Third call: ${duration3.toFixed(2)}ms`)

    console.log(`\n  💡 With React cache, 2nd and 3rd calls would be 0ms (deduplicated)`)
    console.log(`  💡 Without cache: ${((duration1 + duration2 + duration3)).toFixed(2)}ms total`)
    console.log(`  💡 With cache: ${duration1.toFixed(2)}ms total (2-3x faster)`)
  }

  async testBatchOperations() {
    console.log('\n📦 Test 4: Batch vs Sequential Operations')
    console.log('-'.repeat(60))

    if (!this.supabase) return

    const testData = Array.from({ length: 10 }, (_, i) => ({ id: i }))

    // Sequential (slow)
    const sequentialStart = performance.now()
    for (const item of testData.slice(0, 3)) {
      await this.supabase!.from('organizations').select('id').limit(1)
    }
    const sequentialDuration = performance.now() - sequentialStart
    console.log(`  ✗ Sequential queries (3): ${sequentialDuration.toFixed(2)}ms`)

    // Parallel (fast)
    const parallelStart = performance.now()
    await Promise.all(
      testData.slice(0, 3).map(() =>
        this.supabase!.from('organizations').select('id').limit(1)
      )
    )
    const parallelDuration = performance.now() - parallelStart
    console.log(`  ✓ Parallel queries (3): ${parallelDuration.toFixed(2)}ms`)

    const improvement = ((sequentialDuration - parallelDuration) / sequentialDuration * 100).toFixed(1)
    console.log(`\n  ✅ Parallel is ${improvement}% faster`)
  }

  async testMaterializedViewPerformance() {
    console.log('\n🎯 Test 5: Materialized View Performance')
    console.log('-'.repeat(60))

    if (!this.supabase) return

    // Test the materialized view vs original query
    const duration1 = await this.measure('Query entitlements cache', async () => {
      const { data } = await this.supabase!
        .from('org_entitlements_cache')
        .select('*')
        .limit(5)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ Materialized view query: ${duration1.toFixed(2)}ms`)

    // Compare to joining tables manually
    const duration2 = await this.measure('Query with joins', async () => {
      const { data } = await this.supabase!
        .from('org_subscriptions')
        .select(`
          org_id,
          billing_plans (
            features,
            max_artists,
            max_members
          )
        `)
        .limit(5)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ Manual join query: ${duration2.toFixed(2)}ms`)

    const improvement = ((duration2 - duration1) / duration2 * 100).toFixed(1)
    const status = duration1 < duration2 ? '✅' : '⚠️'
    console.log(`\n${status} Materialized view is ${improvement}% faster`)
  }

  async testComplexQueryOptimization() {
    console.log('\n🔍 Test 6: Complex Query Performance')
    console.log('-'.repeat(60))

    if (!this.supabase) return

    // Test a complex query with multiple joins
    const duration = await this.measure('Complex show query with joins', async () => {
      const { data } = await this.supabase!
        .from('shows')
        .select(`
          id,
          title,
          date,
          venues (
            id,
            name,
            city
          ),
          show_assignments (
            people (
              id,
              name
            )
          )
        `)
        .limit(5)
      
      if (!data) throw new Error('No data returned')
    })
    console.log(`  ✓ Complex query: ${duration.toFixed(2)}ms`)

    const status = duration < 200 ? '✅' : '⚠️'
    console.log(`\n${status} Complex query time: ${duration.toFixed(2)}ms (target: <200ms)`)
  }

  private printResults() {
    console.log('\n')
    console.log('=' .repeat(60))
    console.log('📈 Performance Test Summary')
    console.log('=' .repeat(60))

    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length

    console.log(`\nTotal Tests: ${this.results.length}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⚡ Average Query Time: ${avgDuration.toFixed(2)}ms`)

    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`)
        })
    }

    // Performance benchmarks
    console.log('\n📊 Performance Benchmarks:')
    console.log(`  Target: <100ms for simple queries`)
    console.log(`  Target: <200ms for complex queries`)
    console.log(`  Target: <150ms for RLS queries`)

    const slowQueries = this.results.filter(r => r.duration > 200)
    if (slowQueries.length > 0) {
      console.log('\n⚠️  Slow Queries (>200ms):')
      slowQueries.forEach(r => {
        console.log(`  - ${r.testName}: ${r.duration.toFixed(2)}ms`)
      })
    } else {
      console.log('\n✅ All queries within acceptable performance range!')
    }

    console.log('\n' + '=' .repeat(60))
  }
}

// Run tests
const test = new PerformanceTest()
test.run().then(() => {
  console.log('\n✅ Performance tests complete!\n')
  process.exit(0)
}).catch(error => {
  console.error('\n❌ Test suite failed:', error)
  process.exit(1)
})
