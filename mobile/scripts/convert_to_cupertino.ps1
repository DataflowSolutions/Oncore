#!/usr/bin/env pwsh
# Cupertino Conversion Script
# Converts Material widgets to Cupertino equivalents across the codebase

Write-Host "Starting Cupertino conversion..." -ForegroundColor Green

$files = Get-ChildItem -Path "lib" -Filter "*.dart" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Skip already converted files
    if ($content -match "package:flutter/cupertino.dart") {
        continue
    }
    
    # Import conversions
    $content = $content -replace "import 'package:flutter/material.dart';", "import 'package:flutter/cupertino.dart';"
    
    # Widget conversions
    $content = $content -replace "\bScaffold\b", "CupertinoPageScaffold"
    $content = $content -replace "\bAppBar\b", "CupertinoNavigationBar"
    $content = $content -replace "\bFloatingActionButton\b", "CupertinoButton"
    $content = $content -replace "\bElevatedButton\b", "CupertinoButton.filled"
    $content = $content -replace "\bFilledButton\b", "CupertinoButton.filled"
    $content = $content -replace "\bOutlinedButton\b", "CupertinoButton"
    $content = $content -replace "\bTextButton\b", "CupertinoButton"
    $content = $content -replace "\bIconButton\b", "CupertinoButton"
    
    # Progress indicators
    $content = $content -replace "\bCircularProgressIndicator\b", "CupertinoActivityIndicator"
    
    # Dialogs
    $content = $content -replace "\bAlertDialog\b", "CupertinoAlertDialog"
    $content = $content -replace "\bshowDialog\b", "showCupertinoDialog"
    
    # Icons  
    $content = $content -replace "\bIcons\.", "CupertinoIcons."
    
    # Theme access
    $content = $content -replace "Theme\.of\(context\)\.colorScheme", "CupertinoTheme.of(context)"
    
    # Only write if changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Converted: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "Conversion complete!" -ForegroundColor Green
Write-Host "Note: Manual adjustments will be needed for complex widgets" -ForegroundColor Cyan
