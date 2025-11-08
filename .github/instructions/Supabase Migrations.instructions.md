---
applyTo: '**'
---
If your project uses Supabase and you need to manage database schema changes, you always do such using the Supabase CLI tool.
Example use cases:
- Creating a new migration after modifying your database schema.
supabase migration new <migration_name>
- Applying pending migrations to your database.
supabase migration up

NEVER modify existing migration files directly. Always create a new migration for any schema changes. 
NEVER delete existing migration files. If you need to revert a migration, create a new migration that undoes the changes.
ONLY EDIT already applied migration files if they have not been applied to production yet.
NEVER apply migratons directly to the production database, CI/CD pipelines should handle that.