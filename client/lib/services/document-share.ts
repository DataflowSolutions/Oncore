/**
 * Document Share Service for Web Client
 * 
 * Provides document sharing and copying operations for the web version.
 * Mirrors the mobile implementation (mobile/lib/services/document_share_service.dart)
 * allowing code reuse and consistent behavior across platforms.
 * 
 * Features:
 * - Copy document links to clipboard
 * - Native share functionality
 * - Batch share operations
 * - Metadata copying
 */

import { logger } from '@/lib/logger';
import { getAdvancingFileUrl } from '@/lib/actions/advancing/documents';

export interface DocumentInfo {
  id: string;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  storagePath: string;
}

/**
 * Format file size for display
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Copy text to clipboard with fallback
 * @param text Text to copy
 * @returns True if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Use modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for non-secure contexts or older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
    return false;
  }
}

/**
 * Copy document link to clipboard
 * @param document Document information
 * @returns True if successful
 */
export async function copyDocumentLink(document: DocumentInfo): Promise<boolean> {
  try {
    const result = await getAdvancingFileUrl(document.storagePath);

    if (!result.success || !result.url) {
      logger.error('Failed to generate shareable link', result.error);
      return false;
    }

    return await copyToClipboard(result.url);
  } catch (error) {
    logger.error('Error copying document link', error);
    return false;
  }
}

/**
 * Copy document metadata to clipboard
 * @param document Document information
 * @returns True if successful
 */
export async function copyDocumentMetadata(
  document: DocumentInfo
): Promise<boolean> {
  try {
    const metadata = [
      `File: ${document.originalName || 'Unnamed'}`,
      `Size: ${formatFileSize(document.sizeBytes)}`,
      `Type: ${document.contentType || 'unknown'}`,
    ].join('\n');

    return await copyToClipboard(metadata);
  } catch (error) {
    logger.error('Error copying document metadata', error);
    return false;
  }
}

/**
 * Share document using the Web Share API
 * @param document Document information
 * @param showTitle Title of the show
 * @returns True if share was initiated
 */
export async function shareDocument(
  document: DocumentInfo,
  showTitle: string
): Promise<boolean> {
  try {
    // Check if Web Share API is available
    if (!navigator.share) {
      logger.warn('Web Share API not available, falling back to copy');
      return await copyDocumentLink(document);
    }

    const result = await getAdvancingFileUrl(document.storagePath);

    if (!result.success || !result.url) {
      logger.error('Failed to generate shareable link', result.error);
      return false;
    }

    await navigator.share({
      title: `Document: ${document.originalName || 'Unnamed'}`,
      text: `Check out this document from "${showTitle}"\n\n${document.originalName || 'Unnamed'}\nSize: ${formatFileSize(document.sizeBytes)}`,
      url: result.url,
    });

    return true;
  } catch (error) {
    // User cancelled share or error occurred
    if ((error as Error).name === 'AbortError') {
      logger.debug('Share cancelled by user');
    } else {
      logger.error('Error sharing document', error);
    }
    return false;
  }
}

/**
 * Share multiple documents
 * @param documents Array of documents
 * @param showTitle Title of the show
 * @returns Number of successfully shared documents
 */
export async function shareMultipleDocuments(
  documents: DocumentInfo[],
  showTitle: string
): Promise<number> {
  if (documents.length === 0) {
    return 0;
  }

  try {
    // Check if Web Share API is available
    if (!navigator.share) {
      logger.warn('Web Share API not available, using copy fallback');
      return await copyMultipleDocumentLinks(documents);
    }

    const links: string[] = [];

    for (const doc of documents) {
      const result = await getAdvancingFileUrl(doc.storagePath);
      if (result.success && result.url) {
        links.push(`${doc.originalName || 'Unnamed'}: ${result.url}`);
      }
    }

    if (links.length === 0) {
      logger.error('Failed to generate shareable links');
      return 0;
    }

    await navigator.share({
      title: 'Show Documents',
      text: `Documents from "${showTitle}":\n\n${links.join('\n')}`,
    });

    return links.length;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.debug('Share cancelled by user');
    } else {
      logger.error('Error batch sharing documents', error);
    }
    return 0;
  }
}

/**
 * Batch copy document links to clipboard
 * Fallback when Web Share API is unavailable
 * @param documents Array of documents
 * @returns Number of successfully copied links
 */
export async function copyMultipleDocumentLinks(
  documents: DocumentInfo[]
): Promise<number> {
  if (documents.length === 0) {
    return 0;
  }

  try {
    const links: string[] = [];

    for (const doc of documents) {
      const result = await getAdvancingFileUrl(doc.storagePath);
      if (result.success && result.url) {
        links.push(`${doc.originalName || 'Unnamed'}: ${result.url}`);
      }
    }

    if (links.length === 0) {
      logger.error('Failed to generate shareable links');
      return 0;
    }

    const text = links.join('\n');
    const success = await copyToClipboard(text);

    return success ? links.length : 0;
  } catch (error) {
    logger.error('Error batch copying document links', error);
    return 0;
  }
}

/**
 * Download a document
 * @param document Document information
 * @returns True if download was initiated
 */
export async function downloadDocument(doc: DocumentInfo): Promise<boolean> {
  try {
    const result = await getAdvancingFileUrl(doc.storagePath);

    if (!result.success || !result.url) {
      logger.error('Failed to generate download URL', result.error);
      return false;
    }

    const link = globalThis.document.createElement('a');
    link.href = result.url;
    link.download = doc.originalName || 'document';
    link.style.display = 'none';
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);

    return true;
  } catch (error) {
    logger.error('Error downloading document', error);
    return false;
  }
}

/**
 * Get shareable information about a document
 * @param document Document information
 * @returns Document info object
 */
export function getDocumentInfo(document: DocumentInfo) {
  return {
    id: document.id,
    name: document.originalName || 'Unnamed',
    size: document.sizeBytes,
    formattedSize: formatFileSize(document.sizeBytes),
    type: document.contentType,
    storagePath: document.storagePath,
  };
}

/**
 * Determine if a document can be previewed in browser
 * @param contentType MIME type of document
 * @returns True if document can be previewed
 */
export function canPreviewDocument(contentType: string | null): boolean {
  if (!contentType) return false;
  return (
    contentType.startsWith('image/') ||
    contentType.includes('pdf') ||
    contentType.startsWith('text/')
  );
}

/**
 * Determine if document is an image
 * @param contentType MIME type of document
 * @returns True if document is an image
 */
export function isImageDocument(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.startsWith('image/');
}

/**
 * Determine if document is a PDF
 * @param contentType MIME type of document
 * @returns True if document is a PDF
 */
export function isPdfDocument(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.includes('pdf');
}
