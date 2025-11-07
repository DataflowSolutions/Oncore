# 🎯 Deployment Setup Checklist

Follow this checklist to set up automated deployments:

## ✅ Pre-Deployment Checklist

- [ ] **1. Supabase Project Ready**
  - Production Supabase project created
  - Database initialized
  - All necessary extensions enabled

- [ ] **2. Get Supabase Credentials**
  - [ ] Get Access Token from https://supabase.com/dashboard/account/tokens
  - [ ] Find Project Reference ID in project settings
  - [ ] Note down project URL and keys

- [ ] **3. Configure GitHub Secrets**
  - [ ] Add `SUPABASE_ACCESS_TOKEN` to GitHub secrets
  - [ ] Add `SUPABASE_PROJECT_REF` to GitHub secrets

- [ ] **4. Test Locally First**
  - [ ] Run `npx supabase link --project-ref YOUR_REF`
  - [ ] Run `npx supabase db push --linked` manually
  - [ ] Verify migrations work correctly

- [ ] **5. Push to GitHub**
  - [ ] Commit all migration files
  - [ ] Push to `main` branch
  - [ ] Watch GitHub Actions run

- [ ] **6. Verify Deployment**
  - [ ] Check GitHub Actions succeeded
  - [ ] Check database in Supabase dashboard
  - [ ] Verify ANALYZE ran post-deployment (check maintenance log)
  - [ ] Test application with production database

- [ ] **7. Set Up Scheduled Maintenance (Optional but Recommended)**
  - [ ] Enable pg_cron extension in Supabase
  - [ ] Schedule daily ANALYZE (see DATABASE_MAINTENANCE.md)
  - [ ] Schedule weekly VACUUM (see DATABASE_MAINTENANCE.md)
  - [ ] Or set up Edge Function for maintenance

## 🔍 GitHub Secrets Setup

Go to: `https://github.com/YOUR_USERNAME/Oncore/settings/secrets/actions`

### Add These Secrets:

#### SUPABASE_ACCESS_TOKEN
```
1. Visit: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it "GitHub Actions"
4. Copy the token
5. Paste in GitHub secret
```

#### SUPABASE_PROJECT_REF
```
1. Open your Supabase project
2. Go to Settings → General
3. Copy "Reference ID"
4. Paste in GitHub secret
```

## 🧪 Testing the Setup

### Test Manual Deployment:
```bash
cd client

# Link to production
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push --linked

# Generate types
npx supabase gen types typescript --linked > lib/database.types.ts
```

### Test Automatic Deployment:
```bash
# Make a small change
echo "-- Test migration" > supabase/migrations/99999999999999_test.sql

# Commit and push
git add .
git commit -m "test: verify deployment pipeline"
git push origin main

# Watch GitHub Actions tab
```

## 🚨 Troubleshooting

### If GitHub Actions Fails:

1. **Check Secrets Are Set**
   - Go to Settings → Secrets → Actions
   - Verify both secrets exist

2. **Check Token Permissions**
   - Token needs access to your project
   - Regenerate if needed

3. **Check Migration Syntax**
   - Ensure SQL is valid
   - Test locally first

4. **Check Project Reference**
   - Must match exactly
   - No spaces or extra characters

## 📝 Quick Commands

```bash
# Local development
make supabase-start

# Create new migration
make migration-new

# Test migrations locally
make db-reset

# Manual production deployment
make deploy

# Verify production status
make verify-prod

# Generate types from production
make generate-types
```

## ✨ Success Indicators

You'll know it's working when:
- ✅ GitHub Actions shows green checkmark
- ✅ Supabase dashboard shows new migrations
- ✅ `database.types.ts` is updated automatically
- ✅ Application works with production DB

## 🎉 Next Steps After Setup

1. **Enable Branch Protection**
   - Require status checks before merging
   - Require pull request reviews

2. **Add More Workflows**
   - Linting and type checking
   - Automated tests
   - Preview deployments

3. **Set Up Monitoring**
   - Add Slack/Discord notifications
   - Monitor deployment success rate
   - Track migration execution time

---

**Once all items are checked, you're ready to deploy! 🚀**
