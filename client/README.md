# Oncore

A Next.js application with full Supabase integration for local development and production deployment.

## 🚀 Features

- **Environment Switching**: Seamlessly switch between local and production databases
- **CI/CD Pipeline**: Automated database migrations on deployment
- **Docker Support**: Full containerization for both development and production
- **Type Safety**: Auto-generated TypeScript types from your database schema
- **Local Development**: Complete local Supabase stack with Docker

## 📋 Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn
- Supabase CLI (installed automatically via npm)
- Make (for running Makefile commands)

## ⚡ Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd Oncore
   make install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start local development:**
   ```bash
   make setup-local
   ```

4. **Access your services:**
   - Next.js App: http://localhost:3000
   - Supabase Studio: http://localhost:54323
   - Database: postgresql://postgres:postgres@localhost:54322/postgres

## 🔧 Environment Configuration

The application supports both local (Docker) and production (Supabase Cloud) environments with proper separation of client and server-side variables.

### Environment Switcher

Use these flags to switch between environments:

```bash
# .env.local
NEXT_PUBLIC_PROD_DB=false  # Client-side: false = local, true = production
PROD_DB=false              # Server-side: false = local, true = production
```

**Important:** Both flags should always match! They control client and server-side environment selection respectively.

### Full Environment Variable Matrix

#### 🌐 Client-Side Variables (Browser-Safe)

These use the `NEXT_PUBLIC_` prefix and are safe to expose in the browser:

| Variable | Local Dev | Production | Required |
|----------|-----------|------------|----------|
| `NEXT_PUBLIC_PROD_DB` | `false` | `true` | ✅ Always |
| `NEXT_PUBLIC_LOCAL_SUPABASE_URL` | `http://127.0.0.1:54321` | - | ✅ Local only |
| `NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY` | (See .env.example) | - | ✅ Local only |
| `NEXT_PUBLIC_PROD_SUPABASE_URL` | - | Your cloud URL | ✅ Prod only |
| `NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY` | - | Your anon key | ✅ Prod only |

#### 🔒 Server-Side Variables (Secrets)

These do **NOT** have `NEXT_PUBLIC_` prefix and are never exposed to the browser:

| Variable | Local Dev | Production | Required |
|----------|-----------|------------|----------|
| `PROD_DB` | `false` | `true` | ✅ Always |
| `LOCAL_SUPABASE_URL` | `http://127.0.0.1:54321` | - | ✅ Local only |
| `LOCAL_SUPABASE_ANON_KEY` | (See .env.example) | - | ✅ Local only |
| `LOCAL_SUPABASE_SERVICE_ROLE_KEY` | (See .env.example) | - | ✅ Local only |
| `LOCAL_DATABASE_URL` | `postgresql://...` | - | ✅ Local only |
| `PROD_SUPABASE_URL` | - | Your cloud URL | ✅ Prod only |
| `PROD_SUPABASE_ANON_KEY` | - | Your anon key | ✅ Prod only |
| `PROD_SUPABASE_SERVICE_ROLE_KEY` | - | Your service key | ✅ Prod only |
| `PROD_DATABASE_URL` | - | `postgresql://...` | ✅ Prod only |

#### 🛠️ Development & CI/CD

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_PROJECT_REF` | Supabase project ID | ✅ Always |
| `SUPABASE_ACCESS_TOKEN` | CLI authentication | For CI/CD |
| `GEMINI_API_KEY` | Google Gemini API | Optional |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | Optional |

### 🔐 Security Best Practices

**✅ DO:**
- Use `NEXT_PUBLIC_` prefix ONLY for non-sensitive data (URLs, anon keys)
- Keep service role keys server-side only (no `NEXT_PUBLIC_` prefix)
- Store production secrets in Vercel/hosting environment variables
- Use `.env.local` for local development (git-ignored)

**❌ DON'T:**
- Never add `NEXT_PUBLIC_` to service role keys
- Never commit `.env.local` to git
- Never expose database URLs to the client
- Never use admin keys in browser code

### 🔄 Supabase Proxy Usage

**Local Development (Docker):**
- Supabase runs in Docker containers
- Direct connection via `http://127.0.0.1:54321`
- No proxy needed - services communicate directly

**Production:**
- Direct connection to Supabase Cloud
- URLs like `https://[project-ref].supabase.co`
- No proxy - standard HTTPS connections

**Note:** This app does NOT use Next.js middleware proxying for Supabase. All connections are direct to avoid latency and complexity.

### 📝 Example Configurations

#### Local Development (.env.local)
```bash
# Environment switcher
NEXT_PUBLIC_PROD_DB=false
PROD_DB=false

# Local Docker Supabase (client-side)
NEXT_PUBLIC_LOCAL_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Local Docker Supabase (server-side)
LOCAL_SUPABASE_URL=http://127.0.0.1:54321
LOCAL_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LOCAL_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Project settings
SUPABASE_PROJECT_REF=your_project_ref
```

#### Production (.env.production or hosting env vars)
```bash
# Environment switcher
NEXT_PUBLIC_PROD_DB=true
PROD_DB=true

# Production Supabase (client-side)
NEXT_PUBLIC_PROD_SUPABASE_URL=https://tabcxfaqqkfbchbxgogl.supabase.co
NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Production Supabase (server-side secrets)
PROD_SUPABASE_URL=https://tabcxfaqqkfbchbxgogl.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_DATABASE_URL=postgresql://postgres:[password]@db.tabcxfaqqkfbchbxgogl.supabase.co:5432/postgres

# Project settings
SUPABASE_PROJECT_REF=tabcxfaqqkfbchbxgogl
```

## 🛠️ Available Commands

### Development
```bash
make supabase-start    # Start local Supabase + Next.js
make supabase-stop     # Stop all services
make supabase-studio   # Open Supabase Studio
make dev               # Start Next.js only
make help              # Show all available commands
```

### Database Management
```bash
make migration-new     # Create a new migration
make migration-diff    # Generate migration from remote changes
make db-push          # Push local schema to production
make db-pull          # Pull production schema to local
make db-reset         # Reset local database
make generate-types   # Generate TypeScript types
```

### Production Deployment
```bash
make deploy           # Deploy migrations + generate types
make setup-prod       # Setup production environment
```

## 🚀 CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow that:

1. **On Pull Requests:**
   - Validates database migrations
   - Shows migration diffs
   - Runs tests (if configured)

2. **On Push to Main:**
   - Deploys migrations to production
   - Generates and commits TypeScript types
   - Updates database schema automatically

### Required GitHub Secrets

Add these to your repository settings:

- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token
- `SUPABASE_PROJECT_REF` - Your project reference ID (`tabcxfaqqkfbchbxgogl`)

## 📁 Project Structure

```
├── .github/workflows/     # CI/CD pipeline
├── app/                   # Next.js app directory
├── components/           # React components
├── docs/                 # Documentation
├── lib/                  # Utilities and configurations
│   ├── supabase.ts      # Supabase client configuration
│   ├── env.ts           # Environment configuration
│   └── database.types.ts # Auto-generated database types
├── supabase/            # Supabase configuration
│   ├── config.toml      # Local Supabase settings
│   ├── migrations/      # Database migrations
│   └── seed.sql         # Database seed data
├── docker-compose.yml   # Docker services
├── Makefile            # Development commands
└── .env.example        # Environment variables template
```

## 🔄 Development Workflow

1. **Make database changes locally:**
   ```bash
   # Edit your schema in Supabase Studio or via SQL
   make supabase-studio
   ```

2. **Create migration:**
   ```bash
   make migration-new
   # OR generate from remote changes
   make migration-diff
   ```

3. **Test locally:**
   ```bash
   make db-reset  # Apply all migrations
   ```

4. **Deploy to production:**
   ```bash
   git add . && git commit -m "Add new feature"
   git push origin main  # Triggers automatic deployment
   ```

## 🐛 Troubleshooting

### Common Issues

- **Supabase won't start**: Try `make supabase-restart`
- **Database connection issues**: Check your `.env.local` file
- **Migration errors**: Run `make db-reset` to reset local database
- **Type errors**: Run `make generate-types` to update TypeScript types

### Getting Help

- Run `make help` to see all available commands
- Check the [Supabase documentation](https://supabase.com/docs)
- See detailed setup instructions in `docs/supabase-setup.md`

## 📝 License

[Add your license here]
