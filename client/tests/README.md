# Oncore Testing Suite

Complete testing suite including performance, security, and integration tests with support for both local and production databases.

## 📁 Test Structure

```
tests/
├── config/                 # Test configuration
│   └── database-config.ts # Database environment management
├── security/              # Security & RLS tests
│   └── rls-vulnerability.test.ts  # RLS vulnerability testing
├── unit/                  # Unit tests for individual functions
│   ├── cache.test.ts     # React cache helpers tests
│   └── action-optimizations.test.ts
├── performance/          # Performance benchmarks
│   ├── database-performance.test.ts    # Database query speed
│   ├── grid-save-performance.test.ts   # Batch operations
│   └── stress-test.ts    # High-load testing
├── integration/          # End-to-end tests
│   └── page-load-performance.test.ts   # Page load times
├── .env.test            # Test environment configuration
└── package.json         # Test scripts
```

## � Setup

### 1. Install Dependencies

```bash
cd tests
npm install
```

### 2. Configure Test Environment

Edit `tests/.env.test`:

```bash
# Set to 'production' or 'local'
TEST_DB_ENV=local

# Test User Credentials (for RLS testing)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Safety: Prevent destructive tests on production
ALLOW_DESTRUCTIVE_TESTS_ON_PROD=false
```

The tests automatically read database credentials from `client/.env.local`.

## �🚀 Running Tests

### Run All Tests

**Against Local Database:**
```bash
cd tests
npm test
# or
npm run test:local
```

**Against Production Database:**
```bash
npm run test:prod
```

⚠️ **WARNING**: Be extremely careful when running tests against production!

### Run Specific Test Suites

**Security Tests (RLS Vulnerabilities):**
```bash
npm run test:security           # Uses TEST_DB_ENV from .env.test
npm run security:local          # Force local database
npm run security:prod           # Force production database
```

**Performance Tests:**
```bash
npm run test:performance        # Database + Grid performance
npm run test:perf:database      # Database performance only
npm run test:perf:grid          # Grid save performance only
npm run test:perf:stress        # Stress testing
```

**Integration Tests:**
```bash
npm run test:integration        # Page load performance
```

**Unit Tests:**
```bash
npm run test:unit              # Cache and optimization tests
```

## � Security Tests (RLS Vulnerability Testing)

The security test suite comprehensively tests Row Level Security policies for vulnerabilities:

### Critical Vulnerabilities Tested
- ✅ **Cross-Organization Access** - Users cannot access data from other organizations
- ✅ **Unauthenticated Access** - Anonymous users cannot access protected resources
- ✅ **SQL Injection** - Database is protected against injection attacks
- ✅ **Privilege Escalation** - Users cannot elevate their own permissions
- ✅ **Service Role Bypass** - Users cannot bypass RLS using auth headers

### High Priority Tests
- ✅ **Unauthorized Show Access** - Users need proper permissions
- ✅ **Unauthorized Venue Access** - Venue isolation per organization
- ✅ **Unauthorized Artist Access** - Artist data protection
- ✅ **Unauthorized People Access** - Contact data privacy
- ✅ **Join-Based Data Leakage** - No data leaks through table joins
- ✅ **Bulk Data Exfiltration** - Users cannot dump entire database

### Medium Priority Tests
- ✅ **Cross-Org Collaboration** - Collaborators only see assigned shows

**Running Security Tests:**
```bash
# Test locally first (recommended)
npm run security:local

# Then test production
npm run security:prod
```

## �📊 Test Coverage

### Unit Tests
- ✅ Cache function deduplication
- ✅ Batch operation logic
- ✅ Query optimization strategies
- ✅ RLS function improvements

### Performance Tests
- ✅ Database index efficiency (target: <100ms)
- ✅ RLS policy overhead (target: <150ms)
- ✅ Query caching benefits (2-3x improvement)
- ✅ Batch vs sequential operations (10-20x improvement)
- ✅ Materialized view performance (5x improvement)
- ✅ Complex query optimization (target: <200ms)

### Integration Tests
- ✅ Home page load (target: <200ms)
- ✅ Shows list page (target: <200ms)
- ✅ Show detail page (target: <300ms)
- ✅ Advancing page (target: <350ms)

## 🎯 Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Simple queries | <100ms | ✅ |
| RLS queries | <150ms | ✅ |
| Complex queries | <200ms | ✅ |
| Page loads | <300ms | ✅ |
| Batch inserts | 10x faster | ✅ |
| Cache hits | 100% dedup | ✅ |

## 🔧 Setup

### Prerequisites
```bash
# Install dependencies
npm install vitest @vitest/ui tsx @supabase/supabase-js
```

## 🎯 Database Environment Toggle

The test suite supports seamless switching between local and production databases:

### Method 1: Environment Variable

Edit `tests/.env.test`:
```env
TEST_DB_ENV=local       # or 'production'
```

Then run:
```bash
npm test
```

### Method 2: Command Line

```bash
# Use local database
TEST_DB_ENV=local npm test

# Use production database  
TEST_DB_ENV=production npm test
```

### Method 3: Predefined Scripts

```bash
npm run test:local      # Always uses local database
npm run test:prod       # Always uses production database
```

### Safety Features

1. **Production Protection**: Destructive tests disabled on production by default
2. **Clear Warnings**: Console clearly shows which database is being used
3. **Environment Validation**: Tests fail fast if database connection is invalid
4. **Cleanup Control**: Test data cleanup only runs on local environment

### Environment Configuration

The test suite reads database credentials from `client/.env.local`:

**Local Database:**
- `NEXT_PUBLIC_LOCAL_SUPABASE_URL`
- `NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LOCAL_SUPABASE_SERVICE_ROLE_KEY`

**Production Database:**
- `NEXT_PUBLIC_PROD_SUPABASE_URL`
- `NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PROD_SUPABASE_SERVICE_ROLE_KEY`

## 📈 Understanding Test Results

### Security Test Results

```
✅ Passed: All security checks passed
❌ Failed: Security vulnerability detected

Severity Levels:
🔴 CRITICAL - Immediate action required (cross-org access, auth bypass)
🟠 HIGH     - Major security concern (unauthorized access)
🟡 MEDIUM   - Security improvement recommended
🟢 LOW      - Minor security enhancement
```

**If any CRITICAL or HIGH severity tests fail, fix immediately before deploying to production!**

### Database Performance Tests
```
✅ Average query time: 45.23ms (target: <100ms)
```
- All queries should complete in <100ms
- Indexed queries should be <50ms
- Complex joins should be <200ms

### Grid Save Performance Tests
```
✅ Batch (new): 125.45ms
❌ Sequential (old): 2,340.67ms
⚡ 94.6% faster (18.7x speedup)
```
- Batch operations should be 10-20x faster
- Large grids (100+ cells) show biggest improvement

### Page Load Tests
```
✅ Show Detail: 156.78ms (4 queries)
💾 Cache hits: 2 (org + show)
```
- Most pages should load in <300ms
- Cache should eliminate duplicate queries
- Parallel queries should complete together

## 🐛 Common Issues

### Test Fails: "Cannot connect to database"
**Solution:** Check your `.env.test` file and Supabase credentials

### Test Fails: "Query timeout"
**Solution:** 
1. Check database indexes are created
2. Run migration: `npx supabase db push`
3. Check Supabase dashboard for slow queries

### Performance Test Shows Slow Queries
**Solution:**
1. Verify indexes exist: Check migration was applied
2. Check query plans: Use `EXPLAIN ANALYZE` in SQL
3. Monitor Supabase dashboard for bottlenecks

## 📝 Writing New Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest'

describe('My Feature', () => {
  it('should work correctly', () => {
    const result = myFunction()
    expect(result).toBe(expected)
  })
})
```

### Performance Test Example
```typescript
const start = performance.now()
await myOptimizedFunction()
const duration = performance.now() - start

console.log(`Duration: ${duration.toFixed(2)}ms`)
expect(duration).toBeLessThan(100) // Should be fast
```

## 🎯 Benchmarking

To compare before/after performance:

1. **Baseline (before optimization):**
```bash
git checkout main~1  # Go back one commit
npm run benchmark
# Note the results
```

2. **After optimization:**
```bash
git checkout main
npm run benchmark
# Compare results
```

3. **Expected improvements:**
- Page loads: 50-70% faster
- Write operations: 2-3x faster
- Grid saves: 10-20x faster
- Database queries: 40-60% less CPU

## 🔍 Debugging Slow Tests

### Enable Verbose Logging
```typescript
// In test file
console.log('Starting query...')
const start = performance.now()
const result = await query()
console.log(`Query took: ${performance.now() - start}ms`)
```

### Profile Specific Queries
```sql
-- In Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM shows WHERE org_id = 'uuid';
```

### Monitor Live Performance
- Open Supabase Dashboard
- Go to Database → Query Performance
- Sort by "Avg Duration" or "Total Duration"
- Look for queries >100ms

## 📊 Continuous Integration

Add to `.github/workflows/test.yml`:
```yaml
- name: Run Performance Tests
  run: |
    cd tests
    npm install
    npm run test:performance
    
- name: Check Performance Thresholds
  run: |
    # Fail if queries > 200ms
    npm run test:perf:database
```

## 🆘 Support

If tests fail or show unexpected results:

1. Check migration was applied: `npx supabase db diff`
2. Verify indexes exist in database
3. Check Supabase logs for errors
4. Review test output for specific failures
5. Check network latency to Supabase

## 🚀 Production Testing Workflow

### Recommended Testing Flow

1. **Test locally first:**
   ```bash
   npm run test:local
   ```

2. **Run security tests locally:**
   ```bash
   npm run security:local
   ```

3. **If all pass, test security on production:**
   ```bash
   npm run security:prod
   ```

4. **Review results carefully:**
   ```bash
   cat test-results.md
   ```

5. **Only if necessary, run full production suite:**
   ```bash
   npm run test:prod
   ```

### Before Every Deployment

✅ **Always run security tests against production** to verify RLS policies haven't been broken by migrations.

```bash
npm run security:prod
```

## ⚠️ Important Production Notes

### What Tests Do on Production

- **Security Tests**: Read-only checks for vulnerabilities (creates test users)
- **Performance Tests**: Read-only query benchmarks
- **Stress Tests**: High-load read operations
- **Destructive Tests**: Disabled by default (requires `ALLOW_DESTRUCTIVE_TESTS_ON_PROD=true`)

### Test Data Management

- Tests create temporary users with `test-` prefix
- Tests create temporary organizations with "Test" in name
- Cleanup runs automatically on local databases
- Cleanup is **disabled** on production for safety
- Manual cleanup: Check for test records after running

## 🐛 Troubleshooting

### "Cannot connect to database"
**Solution:** Verify your `client/.env.local` has correct credentials for the target environment.

### "Tests skipped - no Supabase connection"
**Solution:** Ensure the anon and service role keys are set in `.env.local`.

### Security tests fail on production
**Critical:** This indicates a real security vulnerability!
1. Review the failed test details
2. Check which RLS policy is broken
3. Fix the policy immediately
4. Rerun tests to verify

### Performance degradation
**Solution:**
1. Check Supabase dashboard for slow queries
2. Verify indexes exist: Run `EXPLAIN ANALYZE` on slow queries
3. Check if migration was applied correctly

## 📝 Test Output Files

After running tests, check these files:

- `test-results.json` - Machine-readable test results
- `test-results.md` - Human-readable summary report

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All security tests pass locally
- [ ] All security tests pass on production
- [ ] Performance tests show acceptable metrics
- [ ] No CRITICAL or HIGH severity vulnerabilities
- [ ] Database queries under performance targets
- [ ] Page loads under 300ms
- [ ] RLS policies verified working
- [ ] Cross-org isolation confirmed
- [ ] Test results reviewed and documented

## 🔐 Security Best Practices

1. **Run security tests before every deployment**
2. **Never disable RLS in production**
3. **Review failed security tests immediately**
4. **Test with multiple user roles**
5. **Verify cross-organization isolation**
6. **Monitor for SQL injection attempts**
7. **Regularly audit RLS policies**

## 📚 Additional Resources

- [RLS Documentation](../docs/role-system.md)
- [Performance Optimization](../docs/PERFORMANCE_OPTIMIZATION_COMPLETE.md)
- [Deployment Checklist](../docs/DEPLOYMENT_CHECKLIST.md)
- [Security Architecture](../docs/architecture-diagrams.md)

---

**Last Updated:** November 4, 2025
**Test Suite Version:** 2.0.0
**Status:** ✅ All tests passing including security
