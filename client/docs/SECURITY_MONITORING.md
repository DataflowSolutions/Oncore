# 🛡️ Security Monitoring Commands

Quick reference for monitoring and verifying security after deployment.

## ✅ Run Security Tests

### Against Production
```powershell
cd C:\Users\albin\Desktop\Oncore\client\tests
npm run security:prod
```

### Against Local
```powershell
cd C:\Users\albin\Desktop\Oncore\client\tests
npm run security:local
```

## 🔍 Verify RLS Status

### Check if RLS is enabled on tables
```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'org_members', 'query_performance_log')
ORDER BY tablename;
```

### Check view security type
```sql
SELECT 
  viewname,
  CASE 
    WHEN definition LIKE '%security_invoker%' THEN 'INVOKER ✅'
    ELSE 'DEFINER ⚠️'
  END as security_type
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('shows_list_view', 'org_seat_usage');
```

### Check function search_path
```sql
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NULL THEN 'NOT SET ⚠️'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN 'SET ✅'
    ELSE 'NOT SET ⚠️'
  END as search_path_status,
  COALESCE(array_to_string(p.proconfig, ', '), 'NOT SET') as config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY search_path_status, p.proname;
```

## 🔒 Test Anonymous Access

### Should be DENIED on critical tables
```sql
-- Run these as anon role (should all fail with permission denied)
SET LOCAL role TO anon;

-- These should all return: ERROR: permission denied for table
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM org_members;

-- Reset role
RESET role;
```

## 📊 Check for Supabase Linter Issues

### Via Supabase CLI
```powershell
cd C:\Users\albin\Desktop\Oncore\client
npx supabase db lint --linked
```

### Via API (Production)
```powershell
# Requires SUPABASE_ACCESS_TOKEN
$headers = @{
    "Authorization" = "Bearer YOUR_ACCESS_TOKEN"
    "apikey" = "YOUR_ANON_KEY"
}
Invoke-RestMethod -Uri "https://alzfpysmlxinthfrbjll.supabase.co/rest/v1/rpc/lint" -Headers $headers
```

## 🎯 Quick Security Audit

### Run all checks at once
```powershell
# 1. Run security tests
cd C:\Users\albin\Desktop\Oncore\client\tests
npm run security:prod

# 2. Check linter
cd C:\Users\albin\Desktop\Oncore\client  
npx supabase db lint --linked

# 3. Check logs for errors
# Go to: https://supabase.com/dashboard/project/alzfpysmlxinthfrbjll/logs/query
```

## 🚨 Rollback Commands (If Needed)

### Rollback last migration
```powershell
cd C:\Users\albin\Desktop\Oncore\client
npx supabase migration down --linked
```

### Rollback multiple migrations
```powershell
# Rollback to specific migration
npx supabase migration down --linked --target 20251104170000
```

## 📈 Monitor Performance Impact

### Check query performance after RLS changes
```sql
SELECT 
  query_name,
  AVG(execution_time_ms) as avg_time_ms,
  COUNT(*) as executions,
  MAX(execution_time_ms) as max_time_ms
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY query_name
ORDER BY avg_time_ms DESC
LIMIT 10;
```

## 🔐 Verify Anonymous User Access

### Test what anonymous users can access
```powershell
# Use anon key to make requests
$headers = @{
    "apikey" = "YOUR_ANON_KEY"
    "Content-Type" = "application/json"
}

# Should return 0 or permission denied
Invoke-RestMethod -Uri "https://alzfpysmlxinthfrbjll.supabase.co/rest/v1/organizations" -Headers $headers
```

## 📝 Regular Maintenance

### Weekly
- [ ] Run `npm run security:prod`
- [ ] Check Supabase dashboard for errors
- [ ] Review slow query logs

### Monthly  
- [ ] Run `npx supabase db lint --linked`
- [ ] Review and fix new linter warnings
- [ ] Update security test suite if schema changes

### Quarterly
- [ ] Full security audit
- [ ] Review and rotate access tokens
- [ ] Update dependencies
- [ ] Test disaster recovery procedures

---

## 🆘 If Security Tests Fail

1. **Check what failed:**
   ```powershell
   npm run security:prod | Select-String "❌"
   ```

2. **Review recent changes:**
   ```powershell
   git log --oneline -10
   ```

3. **Check Supabase logs:**
   - Go to Dashboard → Logs → Query
   - Filter by error level

4. **Rollback if needed:**
   ```powershell
   npx supabase migration down --linked
   git revert HEAD
   git push
   ```

5. **Get help:**
   - Review migration files in `supabase/migrations/`
   - Check test output in `tests/SECURITY_AUDIT_RESULTS.md`
   - Review this document: `docs/SECURITY_FIX_SUMMARY.md`
