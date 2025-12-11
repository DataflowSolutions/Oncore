# Document Share & Copy - Quick Start Guide

## For Mobile Developers

### Using the Document Share Service

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'lib/services/document_share_service.dart';
import 'lib/models/show_day.dart';

// In your widget
class MyDocumentViewer extends ConsumerWidget {
  final DocumentInfo document;
  final String showTitle;

  const MyDocumentViewer({
    required this.document,
    required this.showTitle,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supabase = ref.read(supabaseClientProvider);
    final shareService = DocumentShareService(supabase: supabase);

    return Column(
      children: [
        // Your content here
        
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.content_copy),
              label: const Text('Copy Link'),
              onPressed: () => shareService.copyLinkToClipboard(
                document: document,
                context: context,
              ),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.share),
              label: const Text('Share'),
              onPressed: () => shareService.shareDocument(
                document: document,
                showTitle: showTitle,
                context: context,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
```

### Sharing Multiple Documents

```dart
// Share all documents from a show
final docs = [doc1, doc2, doc3];
final count = await shareService.shareMultipleDocuments(
  documents: docs,
  showTitle: 'Summer Festival 2025',
  context: context,
);
print('Shared $count documents');
```

### Using Document Extensions

```dart
// Quickly get a shareable link
final url = await document.getShareableLink(supabase);
if (url != null) {
  print('Share this: $url');
}
```

## For Web Developers

### Using the Document Share Service

```typescript
import { 
  copyDocumentLink, 
  shareDocument,
  downloadDocument,
  type DocumentInfo 
} from '@/lib/services/document-share';

// Copy link to clipboard
const handleCopy = async (doc: DocumentInfo) => {
  const success = await copyDocumentLink(doc);
  if (success) {
    toast.success('Link copied to clipboard');
  }
};

// Share document
const handleShare = async (doc: DocumentInfo, showTitle: string) => {
  const success = await shareDocument(doc, showTitle);
  if (success) {
    toast.success('Shared successfully');
  } else {
    toast.info('Link copied - fallback share');
  }
};

// Download document
const handleDownload = async (doc: DocumentInfo) => {
  const success = await downloadDocument(doc);
  if (success) {
    toast.success('Download started');
  }
};
```

### Using the DocumentShareActions Component

```tsx
import { DocumentShareActions } from '@/components/documents/DocumentShareActions';

// In your JSX
<DocumentShareActions
  document={{
    id: file.id,
    storagePath: file.storage_path,
    originalName: file.original_name,
    contentType: file.content_type,
    sizeBytes: file.size_bytes,
  }}
  showTitle={show.title}
  onCopySuccess={() => console.log('Copied')}
  onShareSuccess={() => console.log('Shared')}
  size="sm"
/>
```

### Integrating into DocumentsPanel

1. Add import:
```tsx
import { DocumentShareActions } from '@/components/documents/DocumentShareActions';
```

2. Replace file action buttons:
```tsx
// Old code
<Button>
  <Download />
</Button>

// New code
<DocumentShareActions
  document={file}
  showTitle={showTitle}
  size="sm"
/>
```

## Testing the Features

### Mobile Testing

1. **Copy Functionality**
   ```
   1. Open a document
   2. Tap copy button
   3. See "Link copied to clipboard" toast
   4. Open Notes app
   5. Long-press and paste
   6. Should see valid HTTPS URL
   ```

2. **Share Functionality**
   ```
   1. Open a document
   2. Tap share button
   3. Select Share via Email
   4. Compose window opens
   5. Document name and URL should be in message
   6. Send to verify
   ```

### Web Testing

1. **Copy Functionality**
   ```
   1. Hover over document row
   2. Click copy button
   3. Toast: "Link copied to clipboard"
   4. Paste in another tab
   5. Should show file preview
   ```

2. **Share Functionality**
   ```
   - On mobile: Native share sheet opens
   - On desktop (Chrome): Falls back to copy
   - On desktop (Firefox): Falls back to copy
   - All should preserve document URL
   ```

3. **Download Functionality**
   ```
   1. Click download button
   2. File downloads to user's machine
   3. Filename should match original
   ```

## API Reference

### Mobile Service Methods

```dart
class DocumentShareService {
  // Generate a signed URL (1 hour expiry)
  Future<String?> generateShareableLink({
    required String storagePath,
    int expirySeconds = 3600,
  })

  // Copy URL to clipboard
  Future<bool> copyLinkToClipboard({
    required DocumentInfo document,
    BuildContext? context,
  })

  // Open native share sheet
  Future<bool> shareDocument({
    required DocumentInfo document,
    required String showTitle,
    BuildContext? context,
  })

  // Copy metadata (filename, size, type)
  Future<bool> copyMetadataToClipboard({
    required DocumentInfo document,
    BuildContext? context,
  })

  // Share multiple documents
  Future<int> shareMultipleDocuments({
    required List<DocumentInfo> documents,
    required String showTitle,
    BuildContext? context,
  })

  // Get document info object
  Map<String, dynamic> getDocumentInfo(DocumentInfo document)
}
```

### Web Service Functions

```typescript
// Copy text to clipboard (cross-browser)
export async function copyToClipboard(text: string): Promise<boolean>

// Copy document URL link
export async function copyDocumentLink(
  document: DocumentInfo
): Promise<boolean>

// Copy document metadata
export async function copyDocumentMetadata(
  document: DocumentInfo
): Promise<boolean>

// Share using Web Share API (with fallback)
export async function shareDocument(
  document: DocumentInfo,
  showTitle: string
): Promise<boolean>

// Share multiple documents
export async function shareMultipleDocuments(
  documents: DocumentInfo[],
  showTitle: string
): Promise<number>

// Download document
export async function downloadDocument(
  document: DocumentInfo
): Promise<boolean>

// File size formatting
export function formatFileSize(bytes: number | null): string

// Document type detection
export function isPdfDocument(contentType: string | null): boolean
export function isImageDocument(contentType: string | null): boolean
export function canPreviewDocument(contentType: string | null): boolean
```

## Error Handling

The services handle errors gracefully:

- **Network errors**: Logged and user-friendly message shown
- **Clipboard errors**: Fallback graceful handling
- **Share cancellation**: Silent (user cancelled)
- **Invalid files**: Error toast with details

Example:
```dart
try {
  await shareService.shareDocument(...);
} catch (e) {
  // Already handled by service
  // User receives toast notification
}
```

## Performance Considerations

- Signed URL generation: ~100-200ms (network call)
- Clipboard operations: <1ms (local)
- Share sheet: Instant (native)
- No caching of URLs (fresh each time)

## Security Notes

- URLs expire after 1 hour (configurable)
- RLS policies still apply to document access
- No file content exposed in shares
- Signed URLs are tamper-proof (Supabase)
- Clipboard protected by OS

## Browser Compatibility

| Browser | Copy | Share | Download |
|---------|------|-------|----------|
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ✅ | Fallback | ✅ |
| Safari | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| IE | Fallback | ❌ | ✅ |

## Troubleshooting

### "Failed to generate shareable link"
- Check Supabase storage bucket permissions
- Verify document storage path is valid
- Check network connectivity

### "Link copied but share not working"
- Web: Check if HTTPS (required for Clipboard API)
- Mobile: Ensure share_plus is properly integrated
- Check BuildContext is still mounted

### Download not working (web)
- Check CORS settings on Supabase storage
- Verify signed URL generation works first
- Test direct URL access in browser

## Documentation Links

- [Complete System Design](./DOCUMENT_SHARE_SYSTEM.md)
- [Integration Guide](./DOCUMENT_SHARE_INTEGRATION.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

---

**Questions?** Check the full documentation in the `docs/` folder.
