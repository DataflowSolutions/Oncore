# Supabase Local Development Setup

This project uses Supabase for database management with both local and production environments.

## Quick Start

1. **Install dependencies:**
   ```bash
   make install
   ```

2. **Setup local development:**
   ```bash
   make setup-local
   ```

3. **Access your local services:**
   - Next.js App: http://localhost:3000
   - Supabase Studio: http://localhost:54323
   - Database: postgres://postgres:postgres@localhost:54322/postgres

## Environment Switching

Use the `PROD_DB` flag in your `.env.local` file:

- `PROD_DB=false` - Uses local Supabase (default for development)
- `PROD_DB=true` - Uses production Supabase (for production deployments)

## Common Commands

### Development
```bash
make supabase-start    # Start local Supabase
make dev               # Start Next.js dev server
make supabase-studio   # Open Supabase Studio
```

### Database Management
```bash
make migration-new     # Create a new migration
make db-push          # Push schema to production
make db-pull          # Pull schema from production
make generate-types   # Generate TypeScript types
```

### Production Deployment
```bash
make deploy           # Deploy migrations and generate types
```

## CI/CD Pipeline

The project automatically:
- ✅ Validates migrations on pull requests
- 🚀 Deploys migrations to production on merge to main
- 📝 Generates and commits TypeScript types
- 🔄 Keeps local and production schemas in sync

## Required Secrets (GitHub Actions)

Add these to your repository secrets:
- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token
- `SUPABASE_PROJECT_REF` - Your project reference ID (tabcxfaqqkfbchbxgogl)

## Getting Started

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase access token
3. Run `make setup-local` for local development
4. Run `make setup-prod` to link to production

## Troubleshooting

- If Supabase won't start, try `make supabase-restart`
- For database issues, try `make db-reset`
- To see all available commands, run `make help`