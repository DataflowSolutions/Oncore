# Fix ColorScheme type declarations and Material widgets

$files = Get-ChildItem -Path "lib\" -Filter "*.dart" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Fix ColorScheme type to Brightness
    $content = $content -replace 'Widget _buildEmptyState\(ColorScheme colorScheme\)', 'Widget _buildEmptyState(Brightness brightness)'
    $content = $content -replace 'Widget _buildContent\(ColorScheme colorScheme\)', 'Widget _buildContent(Brightness brightness)'
    $content = $content -replace 'Widget _buildFileIcon\(ColorScheme colorScheme\)', 'Widget _buildFileIcon(Brightness brightness)'
    $content = $content -replace 'Color _getMemberTypeColor\(String type, ColorScheme colorScheme\)', 'Color _getMemberTypeColor(String type, Brightness brightness)'
    
    # Fix final colorScheme = CupertinoTheme... declarations
    $content = $content -replace 'final colorScheme = CupertinoTheme\.of\(context\);', 'final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;'
    
    # TimeOfDay fixes - replace with int for hour and minute
    $content = $content -replace 'TimeOfDay\?', 'DateTime?'
    $content = $content -replace 'const TimeOfDay\(hour: 12, minute: 0\)', 'DateTime.now()'
    
    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Fixed $($file.Name)"
    }
}

Write-Host "Done"
