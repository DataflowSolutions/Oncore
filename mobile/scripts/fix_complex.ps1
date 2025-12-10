# Fix remaining complex issues across files

$files = Get-ChildItem -Path "lib\" -Filter "*.dart" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Fix CupertinoActivityIndicator strokeWidth parameter (doesn't exist)
    $content = $content -replace ',\s*strokeWidth:\s*\d+,', ','
    $content = $content -replace 'strokeWidth:\s*\d+,\s*', ''
    
    # Fix CupertinoButton.styleFrom (doesn't exist)
    $content = $content -replace 'CupertinoButton\.styleFrom\([^)]+\)', ''
    $content = $content -replace 'style:\s*CupertinoButton\.filled\.styleFrom\([^)]+\),', ''
    
    # Fix Colors.red to CupertinoColors.destructiveRed
    $content = $content -replace 'Colors\.red', 'CupertinoColors.destructiveRed'
    $content = $content -replace 'Colors\.white', 'CupertinoColors.white'
    $content = $content -replace 'Colors\.grey\[(\d+)\]', 'CupertinoColors.systemGrey'
    
    # Fix icon parameter (Cupertino buttons don't have icon parameter)
    $content = $content -replace 'icon:\s*Icon\(([^)]+)\),\s*\n\s*child:', 'child: Icon($1),'
    $content = $content -replace 'icon:\s*const Icon\(([^)]+)\),\s*\n\s*child:', 'child: const Icon($1),'
    
    # Fix Material TextField - replace with CupertinoTextField patterns
    $content = $content -replace 'TextField\(', 'CupertinoTextField('
    $content = $content -replace 'InputDecoration\(', '// InputDecoration('
    $content = $content -replace 'InputBorder\.none', '// InputBorder.none'
    $content = $content -replace 'UnderlineInputBorder\(', '// UnderlineInputBorder('
    $content = $content -replace 'OutlineInputBorder\(', '// OutlineInputBorder('
    
    # Fix Switch to CupertinoSwitch
    $content = $content -replace 'Switch\(', 'CupertinoSwitch('
    $content = $content -replace 'activeTrackColor:', 'activeColor:'
    $content = $content -replace 'thumbColor:\s*WidgetStateProperty\.all\([^)]+\),', ''
    
    # Fix DropdownButton patterns
    $content = $content -replace 'DropdownButtonFormField', '// DropdownButtonFormField'
    $content = $content -replace 'DropdownMenuItem', '// DropdownMenuItem'
    $content = $content -replace 'dropdownColor:', '// dropdownColor:'
    
    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Fixed complex issues in $($file.Name)"
    }
}

Write-Host "Done fixing complex issues"
