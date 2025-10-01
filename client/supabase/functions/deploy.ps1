# Deploy all Edge Functions to Supabase
Write-Host "Deploying Oncore Edge Functions..." -ForegroundColor Green

# Check if Supabase CLI is installed
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Supabase CLI is not installed." -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if we're logged in
$loginCheck = supabase functions list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Supabase. Running login..." -ForegroundColor Yellow
    supabase login
}

# Deploy each function
$functions = @(
    "stripe-webhook",
    "send-email",
    "generate-advancing-pdf"
)

foreach ($func in $functions) {
    Write-Host "`nDeploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to deploy $func" -ForegroundColor Red
    }
}

Write-Host "`n✓ All functions deployed!" -ForegroundColor Green
Write-Host "`nDon't forget to set environment variables:" -ForegroundColor Yellow
Write-Host "  - STRIPE_SECRET_KEY" -ForegroundColor Gray
Write-Host "  - STRIPE_WEBHOOK_SECRET" -ForegroundColor Gray
Write-Host "  - RESEND_API_KEY" -ForegroundColor Gray
