# 🚀 Deployment Setup Guide

This guide will help you set up automatic deployments with database migrations using GitHub Actions.

## 🎯 Overview

When you push to the `main` branch:
1. ✅ GitHub Actions automatically runs
2. 📤 Database migrations are pushed to production Supabase
3. 🎨 TypeScript types are regenerated
4. 💾 Types are committed back to the repository
5. 🎉 Your database is up to date!

## 📋 Prerequisites

Before setting up automated deployments, you need:

1. **Supabase Project** - A production Supabase project
2. **GitHub Repository** - Your code in a GitHub repo
3. **Supabase Access Token** - For CLI authentication
4. **Supabase Project Reference** - Your project ID

## 🔐 Setup GitHub Secrets

You need to add the following secrets to your GitHub repository:

### How to Add Secrets:
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below:

### Required Secrets:

#### `SUPABASE_ACCESS_TOKEN`
- Get it from: https://supabase.com/dashboard/account/tokens
- Click **Generate new token**
- Give it a name like "GitHub Actions"
- Copy the token value

#### `SUPABASE_PROJECT_REF`
- Find it in your Supabase project URL
- Example: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or go to **Project Settings** → **General** → **Reference ID**

## 🎬 How to Deploy

### Automatic Deployment (Recommended)
Simply push to the `main` branch:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

The GitHub Action will automatically:
- Run database migrations
- Update TypeScript types
- Commit the types back to the repo

### Manual Deployment
You can also trigger the workflow manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select the branch (usually `main`)
5. Click **Run workflow**

## 📁 Project Structure

```
Oncore/
├── .github/
│   └── workflows/
│       └── deploy.yml          # 🚀 GitHub Actions workflow
├── client/
│   ├── supabase/
│   │   ├── migrations/         # 📦 Database migrations
│   │   ├── config.toml         # ⚙️ Supabase config
│   │   └── seed.sql           # 🌱 Seed data
│   └── lib/
│       └── database.types.ts   # 🎨 Auto-generated types
└── mobile/
```

## 🔄 Development Workflow

### 1. Make Database Changes Locally

```bash
# Start local Supabase
cd client
npx supabase start

# Make changes to your database using Studio
# http://localhost:54323
```

### 2. Create Migration

```bash
# Generate migration from your changes
npx supabase db diff -f new_feature_name

# Or create empty migration
npx supabase migration new new_feature_name
```

### 3. Test Migration Locally

```bash
# Reset database with migrations
npx supabase db reset

# Verify everything works
npm run dev
```

### 4. Push to GitHub

```bash
git add supabase/migrations/
git commit -m "feat: add new database feature"
git push origin main
```

### 5. Automatic Deployment

GitHub Actions will:
- ✅ Apply your migration to production
- ✅ Generate updated TypeScript types
- ✅ Commit types back to repo

## 📊 Monitoring Deployments

### View Deployment Status
1. Go to your GitHub repository
2. Click the **Actions** tab
3. See the latest workflow runs

### Check Deployment Logs
- Click on any workflow run to see detailed logs
- Each step shows what happened
- Red ❌ means failure, Green ✅ means success

### Troubleshooting Failed Deployments

If a deployment fails:

1. **Check the logs** - Click on the failed workflow run
2. **Common issues:**
   - Invalid SQL in migration
   - Missing secrets
   - Permissions issues
   - Network problems

3. **Fix the issue** and push again:
   ```bash
   # Fix the migration file
   git add supabase/migrations/
   git commit -m "fix: correct migration syntax"
   git push origin main
   ```

## 🛠️ Manual Commands

If you need to run migrations manually:

```bash
cd client

# Link to production (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push --linked

# Generate types
npx supabase gen types typescript --linked > lib/database.types.ts
```

## 🔒 Security Best Practices

1. **Never commit secrets** to the repository
2. **Use GitHub Secrets** for sensitive data
3. **Rotate tokens** periodically
4. **Use read-only tokens** when possible
5. **Enable branch protection** on `main`

## 📚 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development)

## 🆘 Getting Help

If you encounter issues:

1. Check the **Actions** tab for error messages
2. Review the Supabase dashboard for database status
3. Check the Makefile for available commands
4. Review migration files for syntax errors

## ✨ What's Next?

After deployment is set up, you can:

- 🎨 Add more workflow steps (linting, testing)
- 🔄 Set up staging environments
- 📧 Add deployment notifications
- 🧪 Add automated tests before deployment

---

**Happy Deploying! 🚀**
