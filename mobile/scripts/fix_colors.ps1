# Script to fix Cupertino color scheme issues

$files = @(
    "lib\screens\show_day\widgets\catering_screen.dart",
    "lib\screens\show_day\widgets\guestlist_screen.dart",
    "lib\screens\show_day\widgets\team_screen.dart",
    "lib\screens\show_day\widgets\add_contact_screen.dart",
    "lib\screens\show_day\widgets\add_flight_screen.dart",
    "lib\screens\show_day\widgets\add_schedule_item_screen.dart",
    "lib\screens\show_day\widgets\add_guest_screen.dart",
    "lib\screens\show_day\widgets\add_team_member_screen.dart"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot "..\$file"
    if (Test-Path $fullPath) {
        Write-Host "Processing $file..."
        $content = Get-Content $fullPath -Raw
        
        $content = $content -replace 'colorScheme\.onSurface(?!Variant)', 'AppTheme.getForegroundColor(brightness)'
        $content = $content -replace 'colorScheme\.onSurfaceVariant', 'AppTheme.getMutedForegroundColor(brightness)'
        $content = $content -replace 'colorScheme\.surface(?!Container)', 'AppTheme.getBackgroundColor(brightness)'
        $content = $content -replace 'colorScheme\.surfaceContainer(?!High)', 'AppTheme.getCardColor(brightness)'
        $content = $content -replace 'colorScheme\.surfaceContainerHigh(?:est)?', 'AppTheme.getCardColor(brightness)'
        $content = $content -replace 'colorScheme\.outline', 'AppTheme.getBorderColor(brightness)'
        $content = $content -replace 'colorScheme\.primary', 'AppTheme.getPrimaryColor(brightness)'
        $content = $content -replace 'colorScheme\.error', 'CupertinoColors.destructiveRed'
        
        Set-Content $fullPath -Value $content -NoNewline
        Write-Host "  Fixed $file"
    } else {
        Write-Host "  File not found: $file"
    }
}

Write-Host ""
Write-Host "Done"
