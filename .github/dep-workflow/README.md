# GitHub Workflows

This directory contains automated workflows for the Oncore project.

## 📋 Workflows

### 🚀 Deploy to Production (`deploy.yml`)

**Trigger:** Push to `main` branch or manual trigger

**What it does:**
1. Links to production Supabase project
2. Pushes database migrations to production
3. Generates updated TypeScript types
4. Commits types back to repository

**Required Secrets:**
- `SUPABASE_ACCESS_TOKEN` - Get from https://supabase.com/dashboard/account/tokens
- `SUPABASE_PROJECT_REF` - Your project reference ID

**How to use:**
```bash
git push origin main
```

---

### 🧪 Validate Migrations (`validate-migrations.yml`)

**Trigger:** Pull request to `main` branch that changes migration files

**What it does:**
1. Starts local Supabase instance
2. Runs all migrations
3. Validates TypeScript types
4. Ensures migrations are valid before merging

**No secrets required** - runs locally

**How to use:**
```bash
# Automatically runs on PR creation/update
git checkout -b feature/new-migration
# ... make changes ...
git push origin feature/new-migration
# Create PR → workflow runs automatically
```

---

## 🔐 Setting Up Secrets

### For Production Deployment:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

#### `SUPABASE_ACCESS_TOKEN`
- Visit: https://supabase.com/dashboard/account/tokens
- Generate new token
- Copy and save as secret

#### `SUPABASE_PROJECT_REF`
- Go to your Supabase project
- Settings → General → Reference ID
- Copy and save as secret

---

## 📚 Documentation

For detailed setup instructions, see:
- [`/client/docs/DEPLOYMENT.md`](../client/docs/DEPLOYMENT.md) - Full deployment guide
- [`/client/docs/DEPLOYMENT_CHECKLIST.md`](../client/docs/DEPLOYMENT_CHECKLIST.md) - Setup checklist

---

## 🔄 Workflow Diagram

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Deploy Workflow    │
│  - Link Supabase    │
│  - Push Migrations  │
│  - Generate Types   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Production Updated │
└─────────────────────┘


┌─────────────────┐
│  Create PR      │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Validate Workflow  │
│  - Test Local DB    │
│  - Run Migrations   │
│  - Check Types      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  PR Status Updated  │
└─────────────────────┘
```

---

## 🛠️ Maintenance

### Updating Workflows

To modify workflows:
1. Edit the YAML files in this directory
2. Test changes in a feature branch first
3. Use `act` for local workflow testing (optional)

### Monitoring

View workflow runs:
- Go to **Actions** tab in GitHub
- Click on a workflow to see runs
- Click on a run to see logs

---

## ✨ Best Practices

1. **Always test migrations locally first**
   ```bash
   cd client
   npx supabase db reset
   ```

2. **Use descriptive commit messages**
   ```bash
   git commit -m "feat: add user preferences table"
   ```

3. **Review PR validation before merging**
   - Check that validate workflow passes
   - Review generated types

4. **Monitor deployment status**
   - Watch Actions tab after pushing
   - Check Supabase dashboard

---

**Questions?** Check the [DEPLOYMENT.md](../client/docs/DEPLOYMENT.md) guide!
