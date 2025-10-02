# ===================
# DOCKER COMMANDS
# ===================
dev:
	docker compose --profile dev up --build

dev-d:
	docker compose --profile dev up --build -d

dev-down:
	docker compose --profile dev down

prod:
	docker compose --profile prod up --build -d

prod-down:
	docker compose --profile prod down

logs-dev:
	docker compose --profile dev logs -f

logs-prod:
	docker compose --profile prod logs -f

# ===================
# SUPABASE COMMANDS
# ===================

# Install dependencies
install:
	@echo "Installing client dependencies..."
	powershell -Command "npm install"
	@echo "Installing backend dependencies..."
	powershell -Command "cd ../backend; npm install"

# Initialize Supabase (run once)
supabase-init:
	npx supabase init

# Start local Supabase (with Next.js app)
supabase-start:
	npx supabase start
	docker compose --profile dev up --build -d

# Stop local Supabase
supabase-stop:
	npx supabase stop
	docker compose --profile dev down

# Restart local Supabase
supabase-restart:
	npx supabase stop
	npx supabase start

# Open Supabase Studio (local)
supabase-studio:
	@echo "Opening Supabase Studio at http://localhost:54323"
	@start http://localhost:54323

# ===================
# DATABASE MIGRATIONS
# ===================

# Create a new migration
migration-new:
	@echo "Enter migration name:" && read name && npx supabase migration new $$name

# Generate migration from remote database changes
migration-diff:
	npx supabase db diff --linked --schema public

# Apply migrations to local database
migration-up:
	npx supabase db reset

# Push local schema to remote (production)
db-push:
	npx supabase db push --linked

# Pull remote schema to local
db-pull:
	npx supabase db pull --linked

# Reset local database
db-reset:
	npx supabase db reset

# Generate TypeScript types
generate-types:
	powershell -Command "npx supabase gen types typescript --linked | Out-File -FilePath lib/database.types.ts -Encoding UTF8"

# Generate TypeScript types (local)
generate-types-local:
	powershell -Command "npx supabase gen types typescript --local | Out-File -FilePath lib/database.types.ts -Encoding UTF8"

# ===================
# DEPLOYMENT & LINKING
# ===================

# Link to remote Supabase project
supabase-link:
	npx supabase link --project-ref $(SUPABASE_PROJECT_REF)

# Deploy migrations to production
deploy:
	npx supabase db push --linked
	$(MAKE) generate-types

# Seed database (local only)
seed:
	npx supabase db reset --seed-only

# ===================
# DEVELOPMENT WORKFLOWS
# ===================

# Full local development setup (separate terminals)
setup-local-terminals:
	$(MAKE) install
	@echo "Starting Supabase in new terminal..."
	powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd $$PWD; npx supabase start'"
	@echo "Starting Next.js client in new terminal..."
	powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd $$PWD; npm run dev'"
	@echo "Waiting for services to start..."
	@powershell -Command "Start-Sleep -Seconds 10"
	@echo "Generating TypeScript types..."
	$(MAKE) generate-types-local

# Setup for production deployment
setup-prod:
	$(MAKE) install
	$(MAKE) supabase-link
	$(MAKE) generate-types

# Complete reset (use with caution)
reset-all:
	npx supabase stop
	docker compose down -v
	npx supabase start
	$(MAKE) generate-types-local

# ===================
# UTILITIES
# ===================

# Show Supabase status
status:
	npx supabase status

# Show logs from local Supabase
supabase-logs:
	npx supabase logs

# Open database console
db-console:
	npx supabase db inspect

# Help
help:
	@echo "Available commands:"
	@echo "  install                - Install all dependencies"
	@echo "  setup-local           - Complete local development setup (Docker)"
	@echo "  setup-local-terminals - Complete local development setup (separate terminals)"
	@echo "  setup-prod            - Setup for production deployment"
	@echo ""
	@echo "Local Development:"
	@echo "  supabase-start        - Start local Supabase + Next.js"
	@echo "  supabase-stop         - Stop local Supabase"
	@echo "  supabase-studio       - Open Supabase Studio"
	@echo "  dev                   - Start Next.js development server"
	@echo ""
	@echo "Database Management:"
	@echo "  migration-new         - Create new migration"
	@echo "  migration-diff        - Generate migration from remote changes"
	@echo "  db-push               - Push local schema to production"
	@echo "  db-pull               - Pull remote schema to local"
	@echo "  db-reset              - Reset local database"
	@echo "  deploy                - Deploy to production"
	@echo ""
	@echo "Utilities:"
	@echo "  generate-types        - Generate TypeScript types"
	@echo "  status                - Show Supabase status"
	@echo "  help                  - Show this help message"
