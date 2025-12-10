# Comprehensive icon mapping for Cupertino conversion
# Maps Material icons to closest Cupertino equivalents

$iconMappings = @{
    'hotel_outlined' = 'bed_double'
    'flight_outlined' = 'airplane'
    'flight' = 'airplane'
    'restaurant_outlined' = 'cart'
    'email' = 'mail'
    'people_outline' = 'person_3'
    'person_outline' = 'person'
    'group_outlined' = 'person_3'
    'badge_outlined' = 'person_badge_plus'
    'phone_outlined' = 'phone'
    'email_outlined' = 'mail'
    'notes_outlined' = 'doc_text'
    'list_alt_outlined' = 'list_bullet'
    'description_outlined' = 'doc'
    'add_circle_outline' = 'plus_circle'
    'remove_circle_outline' = 'minus_circle'
    'search_off' = 'search'
    'error_outline' = 'exclamationmark_circle'
    'picture_as_pdf' = 'doc'
    'image' = 'photo'
    'description' = 'doc_text'
    'table_chart' = 'table'
    'article' = 'doc_plaintext'
    'insert_drive_file' = 'doc'
    'copy' = 'doc_on_doc'
    'ios_share' = 'share'
}

$files = Get-ChildItem -Path "lib\screens\show_day\widgets\" -Filter "*.dart" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    foreach ($old in $iconMappings.Keys) {
        $new = $iconMappings[$old]
        if ($content -match "CupertinoIcons\.$old") {
            $content = $content -replace "CupertinoIcons\.$old", "CupertinoIcons.$new"
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Fixed icons in $($file.Name)"
    }
}

Write-Host "Done fixing icons"
