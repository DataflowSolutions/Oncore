import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/show_day.dart';
import '../components/app_toast.dart';

/// Service for document sharing and copying operations
/// 
/// This service provides:
/// - Copy to clipboard (file links)
/// - Native share functionality
/// - Shareable link generation (via RPC)
/// - Access control
/// 
/// Designed to be easily ported to web version through equivalent RPC/API calls
class DocumentShareService {
  final SupabaseClient supabase;

  DocumentShareService({required this.supabase});

  /// Generate a public shareable link for a document
  /// 
  /// Returns a temporary signed URL (1 hour expiry) that can be shared
  /// with team members and collaborators
  /// 
  /// Future enhancement: Create persistent shareable links with RPC backend
  Future<String?> generateShareableLink({
    required String storagePath,
    int expirySeconds = 3600, // 1 hour default
  }) async {
    try {
      final response = await supabase.storage
          .from('advancing-files')
          .createSignedUrl(storagePath, expirySeconds);

      return response;
    } catch (e) {
      debugPrint('[DocumentShareService] Error generating shareable link: $e');
      return null;
    }
  }

  /// Copy document file link to clipboard
  /// 
  /// Generates a signed URL and copies it to the system clipboard
  /// Returns true if successful
  Future<bool> copyLinkToClipboard({
    required DocumentInfo document,
    BuildContext? context,
  }) async {
    try {
      final url = await generateShareableLink(
        storagePath: document.storagePath,
      );

      if (url == null) {
        _showError(context, 'Failed to generate shareable link');
        return false;
      }

      // Copy to clipboard
      await _copyToClipboard(url);
      if (context != null && context.mounted) {
        _showSuccess(context, 'Link copied to clipboard');
      }
      return true;
    } catch (e) {
      debugPrint('[DocumentShareService] Error copying link: $e');
      _showError(context, 'Failed to copy link');
      return false;
    }
  }

  /// Share document using native share sheet
  /// 
  /// Opens the system share sheet with document information
  /// Allows users to share via email, messaging, etc.
  /// 
  /// Returns true if share sheet was opened successfully
  Future<bool> shareDocument({
    required DocumentInfo document,
    required String showTitle,
    BuildContext? context,
  }) async {
    try {
      final url = await generateShareableLink(
        storagePath: document.storagePath,
      );

      if (url == null) {
        _showError(context, 'Failed to generate shareable link');
        return false;
      }

      // Prepare share message
      final subject = 'Document: ${document.displayName}';
      final message = '''
Check out this document from the show "$showTitle":

${document.displayName}
${document.formattedSize.isNotEmpty ? 'Size: ${document.formattedSize}' : ''}

Link: $url
      '''.trim();

      // Open share sheet
      try {
        await Share.share(
          message,
          subject: subject,
        );
        
        return true;
      } catch (e) {
        debugPrint('[DocumentShareService] Share sheet error: $e');
        return false;
      }
    } catch (e) {
      debugPrint('[DocumentShareService] Error sharing document: $e');
      if (context != null && context.mounted) {
        _showError(context, 'Failed to share document');
      }
      return false;
    }
  }

  /// Copy document metadata to clipboard (filename, size, date)
  /// 
  /// Useful for quick reference sharing
  Future<bool> copyMetadataToClipboard({
    required DocumentInfo document,
    BuildContext? context,
  }) async {
    try {
      final metadata = '''
File: ${document.displayName}
Size: ${document.formattedSize}
Type: ${document.contentType ?? 'unknown'}
      '''.trim();

      await _copyToClipboard(metadata);
      if (context != null && context.mounted) {
        _showSuccess(context, 'Metadata copied to clipboard');
      }
      return true;
    } catch (e) {
      debugPrint('[DocumentShareService] Error copying metadata: $e');
      _showError(context, 'Failed to copy metadata');
      return false;
    }
  }

  /// Internal clipboard helper
  /// 
  /// Copies text to system clipboard
  /// Uses Flutter's native clipboard through services
  static Future<void> _copyToClipboard(String text) async {
    try {
      await Clipboard.setData(ClipboardData(text: text));
    } catch (e) {
      debugPrint('[DocumentShareService] Clipboard error: $e');
      rethrow;
    }
  }

  /// Helper to show success toast
  static void _showSuccess(BuildContext? context, String message) {
    if (context != null && context.mounted) {
      AppToast.success(context, message);
    }
  }

  /// Helper to show error toast
  static void _showError(BuildContext? context, String message) {
    if (context != null && context.mounted) {
      AppToast.error(context, message);
    }
  }

  /// Batch share multiple documents
  /// 
  /// Shares a list of documents at once
  /// Returns count of successfully shared links
  Future<int> shareMultipleDocuments({
    required List<DocumentInfo> documents,
    required String showTitle,
    BuildContext? context,
  }) async {
    if (documents.isEmpty) {
      _showError(context, 'No documents to share');
      return 0;
    }

    int successCount = 0;

    try {
      final links = <String>[];

      for (final doc in documents) {
        final url = await generateShareableLink(
          storagePath: doc.storagePath,
        );
        if (url != null) {
          links.add('${doc.displayName}: $url');
          successCount++;
        }
      }

      if (links.isEmpty) {
        if (context != null && context.mounted) {
          _showError(context, 'Failed to generate shareable links');
        }
        return 0;
      }

      final message = '''
Documents from show "$showTitle":

${links.join('\n')}
      '''.trim();

      await Share.share(message, subject: 'Show Documents');
      return successCount;
    } catch (e) {
      debugPrint('[DocumentShareService] Error batch sharing: $e');
      if (context != null && context.mounted) {
        _showError(context, 'Failed to share documents');
      }
      return successCount;
    }
  }

  /// Generate a summary of document availability
  /// Useful for checking access and permissions
  Map<String, dynamic> getDocumentInfo(DocumentInfo document) {
    return {
      'id': document.id,
      'name': document.displayName,
      'size': document.sizeBytes,
      'formattedSize': document.formattedSize,
      'type': document.contentType,
      'isImage': document.isImage,
      'isPdf': document.isPdf,
      'storagePath': document.storagePath,
    };
  }
}

/// Extension to add share methods directly to DocumentInfo
extension DocumentShareExtension on DocumentInfo {
  /// Quick method to get shareable link
  Future<String?> getShareableLink(SupabaseClient supabase) {
    return DocumentShareService(supabase: supabase).generateShareableLink(
      storagePath: storagePath,
    );
  }
}
