"use client";

/**
 * Document Share Actions Component
 * 
 * Reusable UI component for document share/copy actions
 * Works with the document-share service for consistent behavior
 * Used in DocumentsPanel and other document-related components
 */

import { useState } from "react";
import { Copy, Share2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  copyDocumentLink,
  //copyDocumentMetadata,
  shareDocument,
  downloadDocument,
  type DocumentInfo,
} from "@/lib/services/document-share";
import { logger } from "@/lib/logger";

interface DocumentShareActionsProps {
  document: DocumentInfo;
  showTitle: string;
  onCopySuccess?: () => void;
  onShareSuccess?: () => void;
  onDownloadSuccess?: () => void;
  variant?: "inline" | "dropdown";
  showDownload?: boolean;
  size?: "sm" | "default";
}

/**
 * Inline action buttons for document sharing
 */
function InlineActions({
  document,
  showTitle,
  onCopySuccess,
  onShareSuccess,
  onDownloadSuccess,
  showDownload = true,
  size = "default",
}: DocumentShareActionsProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopyLink = async () => {
    setIsCopying(true);
    try {
      const success = await copyDocumentLink(document);
      if (success) {
        onCopySuccess?.();
      }
    } catch (error) {
      logger.error("Error copying document link", error);
    } finally {
      setIsCopying(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const success = await shareDocument(document, showTitle);
      if (success) {
        onShareSuccess?.();
      }
    } catch (error) {
      logger.error("Error sharing document", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const success = await downloadDocument(document);
      if (success) {
        onDownloadSuccess?.();
      }
    } catch (error) {
      logger.error("Error downloading document", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const buttonSize = size;
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleCopyLink}
        disabled={isCopying}
        title="Copy link to clipboard"
        className="h-8 w-8 p-0"
      >
        {isCopying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Copy style={{ width: iconSize, height: iconSize }} />
        )}
      </Button>

      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleShare}
        disabled={isSharing}
        title="Share document"
        className="h-8 w-8 p-0"
      >
        {isSharing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Share2 style={{ width: iconSize, height: iconSize }} />
        )}
      </Button>

      {showDownload && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={handleDownload}
          disabled={isDownloading}
          title="Download document"
          className="h-8 w-8 p-0"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download style={{ width: iconSize, height: iconSize }} />
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Primary export for document share actions
 */
export function DocumentShareActions(props: DocumentShareActionsProps) {
  if (props.variant === "dropdown") {
    // TODO: Implement dropdown variant
    return <InlineActions {...props} />;
  }

  return <InlineActions {...props} />;
}

export default DocumentShareActions;
