# Quick Test Reference

## 🚀 Quick Start

```bash
cd client/tests
npm install
```

## 📋 Common Commands

### Test Locally (Safe)
```bash
npm run test:local          # All tests on local DB
npm run security:local      # Security tests only
```

### Test Production (Careful!)
```bash
npm run security:prod       # Security tests on production (RECOMMENDED)
npm run test:prod          # All tests on production (CAREFUL!)
```

### Individual Test Suites
```bash
npm run test:security      # RLS vulnerability tests
npm run test:performance   # Database performance
npm run test:integration   # Page load tests
npm run test:perf:stress   # Stress testing
```

## ⚙️ Configuration

Edit `tests/.env.test`:
```bash
TEST_DB_ENV=local          # or 'production'
```

## 🔒 Security Test Coverage

✅ Cross-organization access prevention
✅ Unauthenticated access blocking
✅ SQL injection prevention
✅ Privilege escalation prevention
✅ Service role bypass prevention
✅ Join-based data leakage
✅ Bulk data exfiltration
✅ Cross-org collaboration security

## 📊 Performance Targets

- Simple queries: <100ms
- RLS queries: <150ms
- Complex queries: <200ms
- Page loads: <300ms

## ⚠️ Before Every Deployment

```bash
# 1. Test security locally
npm run security:local

# 2. Test security on production
npm run security:prod

# 3. Review results
cat test-results.md

# 4. If all pass, deploy!
```

## 🆘 If Security Tests Fail

🔴 **CRITICAL or HIGH severity failures:**
1. **DO NOT DEPLOY**
2. Review the specific vulnerability
3. Fix the RLS policy
4. Retest immediately

🟡 **MEDIUM or LOW severity:**
1. Review and assess risk
2. Create ticket to fix
3. Can deploy if acceptable risk

## 📖 Full Documentation

See `README.md` for complete documentation.
