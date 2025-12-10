# Start local Supabase with ports mapped outside Windows excluded ranges
# Usage: Open PowerShell in this folder and run: .\start-supabase.ps1

$env:SUPABASE_API_PORT=15421
$env:SUPABASE_AUTH_PORT=15422
$env:SUPABASE_STUDIO_PORT=15423
$env:SUPABASE_INBUCKET_PORT=15424
$env:SUPABASE_DB_PORT=15425
$env:SUPABASE_DB_SHADOW_PORT=15420
$env:SUPABASE_DB_POOLER_PORT=15429
$env:SUPABASE_ANALYTICS_PORT=15427
$env:SUPABASE_ANALYTICS_VECTOR_PORT=15428
$env:SUPABASE_PGMETA_PORT=15426
$env:SUPABASE_GATEWAY_PORT=15422

Write-Host "Starting Supabase with overridden ports..."
supabase start --debug