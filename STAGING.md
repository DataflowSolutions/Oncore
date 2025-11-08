# Staging Environment Setup

This document explains how the staging environment works.

## Overview

The `staging` branch serves as a pre-production environment where you can test changes before deploying to production.

## How It Works

### 1. **Automatic Deployments**
- **Push to `staging` branch** → Triggers GitHub Actions workflow
- **GitHub Actions** → Runs migrations and updates types
- **Vercel** → Automatically deploys the staging branch to a preview URL

### 2. **Database**
- Currently uses the **same production database** as main
- Migrations are applied to the shared database
- **Future:** Will be configured to use a separate staging database

### 3. **Environment Variables**
Vercel automatically uses these variables for the staging branch:
- Same as production (for now)
- Set in Vercel dashboard under "Preview" environment

## Workflow

### Testing a New Feature

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Merge to staging:**
   ```bash
   git checkout staging
   git merge feature/my-new-feature
   git push origin staging
   ```

4. **GitHub Actions runs:**
   - Applies database migrations
   - Updates TypeScript types
   - Commits type changes back to staging

5. **Vercel deploys:**
   - Builds the staging branch
   - Deploys to: `https://oncore-staging.vercel.app` (or similar)

6. **Test on staging:**
   - Visit the staging URL
   - Test all functionality
   - Check logs in Vercel dashboard

7. **If all looks good, merge to main:**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

## Vercel Configuration

### Branch Settings
1. Go to: https://vercel.com/dataflowsolutions/oncore/settings/git
2. Configure:
   - **Production Branch:** `main`
   - **Preview Branches:** `staging` and feature branches
   - **Automatic Preview Deployments:** Enabled

### Environment Variables
Set the same variables as production, but for the "Preview" environment:
- `NEXT_PUBLIC_PROD_DB=true`
- `PROD_DB=true`
- `PROD_SUPABASE_URL`
- `PROD_SUPABASE_SERVICE_ROLE_KEY`
- `PROD_SUPABASE_ANON_KEY`
- etc.

## GitHub Secrets Required

Make sure these secrets are set in GitHub:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `GITHUB_TOKEN` (automatically provided)

## Future Improvements

- [ ] Set up separate staging database
- [ ] Configure staging-specific environment variables
- [ ] Add automated testing before deployment
- [ ] Set up staging-specific feature flags

## Useful Commands

```bash
# Switch to staging
git checkout staging

# Merge latest from main
git merge main

# Push staging (triggers deployment)
git push origin staging

# Check CI/CD status
# Visit: https://github.com/DataflowSolutions/Oncore/actions
```

## Troubleshooting

### Deployment fails
- Check GitHub Actions logs
- Verify environment variables in Vercel
- Ensure migrations are valid

### Database migration issues
- Migrations run on the same database as production
- Test migrations locally first with `supabase db reset`
- Follow the Supabase Migrations instructions

### Vercel deployment not triggered
- Check that the branch is pushed: `git push origin staging`
- Verify Vercel is connected to the repository
- Check Vercel project settings
