# Document Share & Copy Implementation

## Overview

This document describes the implementation of a smart document sharing and copying system for the Oncore mobile and web applications. The implementation is designed to be cross-platform compatible, reusing the same logic and RPC calls across both Flutter and TypeScript/React.

## Architecture

The system is built on three layers:

### 1. Service Layer (Business Logic)

**Mobile**: `mobile/lib/services/document_share_service.dart`
- Core sharing and copying operations
- Signed URL generation (uses existing Supabase signed URL functionality)
- Clipboard operations
- Error handling and user feedback

**Web**: `client/lib/services/document-share.ts`
- Equivalent TypeScript implementation
- Web-specific APIs (Clipboard API, Web Share API)
- Fallbacks for older browsers
- Consistent with mobile behavior

### 2. Model Layer

Both platforms use the same document information model:

**Mobile**: `mobile/lib/models/show_day.dart` (DocumentInfo class)
- Properties: id, storagePath, originalName, contentType, sizeBytes
- Helper methods: isImage, isPdf, displayName, formattedSize

**Web**: `client/lib/services/document-share.ts` (DocumentInfo interface)
- Same properties as mobile
- Type-safe with TypeScript

### 3. UI Layer

**Mobile**: `mobile/lib/screens/show_day/widgets/documents_screen.dart`
- Uses DocumentShareService in _DocumentViewerScreenState
- Copy button: copies signed URL to clipboard
- Share button: opens native share sheet
- Integration with app toast notifications

**Web**: `client/components/documents/DocumentShareActions.tsx` (new)
- Reusable React component
- Copy/Share/Download button group
- Inline and dropdown variants
- Toast notifications via existing system

## Features Implemented

### 1. Copy to Clipboard
- **What**: Copies a signed URL that can be shared with team members
- **How**: Generates a 1-hour expiry signed URL and copies to system clipboard
- **User Feedback**: Toast notification confirming copy
- **Mobile**: `copyLinkToClipboard()`
- **Web**: `copyDocumentLink()`

### 2. Native Share
- **Mobile**: Uses `share_plus` package to open native share sheet
  - Works with: Messages, Email, AirDrop, etc.
  - Includes document name and file size
  - Message: `"Check out this document from show 'X'"`

- **Web**: Uses Web Share API with fallback
  - Modern browsers: `navigator.share()`
  - Older browsers: Falls back to clipboard copy
  - Graceful handling of user cancellation

### 3. Copy Metadata
- **What**: Copies filename, size, and type (not just the URL)
- **Use Case**: Quick reference when sharing document info
- **Availability**: Mobile primary, web available via service

### 4. Batch Operations
- **Multiple Documents**: Share or copy multiple documents at once
- **Mobile**: `shareMultipleDocuments()`
- **Web**: `shareMultipleDocuments()`, `copyMultipleDocumentLinks()`
- **Returns**: Count of successfully shared/copied documents

### 5. Download Support (Web)
- **What**: Downloads document to user's local storage
- **How**: Creates temporary download link and triggers browser download
- **Web**: `downloadDocument()`
- **Mobile**: Uses native preview or download via file picker

## Signed URL Generation

Both implementations rely on the existing Supabase functionality:

```typescript
// Mobile (Dart)
final response = await supabase.storage
    .from('advancing-files')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

// Web (TypeScript)
const { data, error } = await supabase.storage
    .from('advancing-files')
    .createSignedUrl(filePath, 3600);
```

**No new RPC required** - Uses Supabase's built-in signed URL creation.

## Future Enhancements

### 1. Persistent Shareable Links (RPC-based)
Create an RPC function to generate persistent shareable links with:
- Custom expiry dates
- Optional access controls
- Audit logging
- Database tracking of shares

```sql
create or replace function create_shareable_document_link(
  p_file_id uuid,
  p_show_id uuid,
  p_expires_in interval default '30 days',
  p_note text default null
)
returns shareable_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link shareable_links;
begin
  -- Implementation here
end;
$$;
```

### 2. Share Analytics
Track which documents are shared:
- Who shared (user_id)
- What was shared (document_id)
- When (timestamp)
- Via which method (copy/share/download)

### 3. Access Control
Add granular sharing controls:
- Public vs. team-only documents
- Role-based access
- Organization-level sharing settings
- Email-specific share links

### 4. Comment/Feedback on Shares
Allow users to:
- Request feedback on shared documents
- Add context notes when sharing
- Track document reviews

## Dependencies Added

### Mobile
```yaml
share_plus: ^7.2.0  # Native share functionality
```

No additional dependencies needed:
- Clipboard operations use Flutter's `services` (built-in)
- Supabase storage already available
- Toast notifications use existing `AppToast`

### Web
No new dependencies needed:
- Uses existing: `lucide-react`, `@/components/ui/button`
- Web APIs: Clipboard API, Web Share API (browser built-in)
- Logger: Uses existing `@/lib/logger`

## Testing

### Mobile Testing
1. **Copy Link**
   - Open document viewer
   - Tap copy button
   - Verify toast: "Link copied to clipboard"
   - Paste in notes/messages app

2. **Share**
   - Open document viewer
   - Tap share button
   - Select share destination
   - Verify document name and URL in share sheet

3. **Multiple Documents**
   - Call `shareMultipleDocuments()` from network tab
   - Verify all links in share sheet

### Web Testing
1. **Copy Link**
   - Hover over document
   - Click copy button
   - Verify clipboard contains signed URL

2. **Share**
   - Click share button
   - On mobile: Native share sheet opens
   - On desktop: Falls back to copy
   - Verify message format

3. **Browser Compatibility**
   - Test on: Chrome, Firefox, Safari
   - Verify fallbacks work on older versions
   - Test HTTPS requirement (Clipboard API)

## Integration Examples

### Mobile - Documents Screen

```dart
Future<void> _shareDocument() async {
  final supabase = ref.read(supabaseClientProvider);
  final shareService = DocumentShareService(supabase: supabase);
  
  await shareService.shareDocument(
    document: _files[_currentFileIndex],
    showTitle: 'Concert Name',
    context: context,
  );
}
```

### Web - Document Component

```tsx
<DocumentShareActions
  document={file}
  showTitle={show.title}
  onCopySuccess={() => toast.success("Copied!")}
  onShareSuccess={() => toast.success("Shared!")}
  showDownload={true}
  size="sm"
/>
```

## File Structure

```
Mobile:
  lib/
    services/
      document_share_service.dart      # Main service (new)
    screens/show_day/widgets/
      documents_screen.dart             # Integration (updated)
    models/
      show_day.dart                     # DocumentInfo model (existing)

Web:
  lib/services/
    document-share.ts                  # Main service (new)
  components/documents/
    DocumentShareActions.tsx            # React component (new)
    DocumentsPanel.tsx                  # Existing (can integrate)
```

## Security Considerations

1. **Signed URLs**: 1-hour expiry prevents long-term link harvesting
2. **RLS Policies**: Existing show access checks apply (no changes needed)
3. **No File Content in Shares**: Only URLs are shared, no file data
4. **Audit Trail**: Future RPC can log all share actions
5. **Clipboard**: Protected by browser/OS security model

## Backwards Compatibility

- No changes to existing document upload/download functionality
- No database schema modifications needed
- Existing RPC functions remain unchanged
- Add-on feature, doesn't affect current workflows
