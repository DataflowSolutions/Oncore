"use client";

import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  contentType: string;
  isLoading: boolean;
  onDownload: (url: string, fileName: string) => void;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  contentType,
  isLoading,
  onDownload,
}: FilePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "overflow-hidden flex flex-col p-0",
          contentType.startsWith("image/") 
            ? "max-w-4xl max-h-[80vh]" 
            : "max-w-[95vw] w-full max-h-[95vh]"
        )}
      >
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="text-xl truncate">{fileName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-neutral-900 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
            </div>
          ) : fileUrl ? (
            <div className="w-full h-full">
              {contentType.startsWith("image/") ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : contentType.includes("pdf") ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={fileName}
                  style={{ minHeight: "80vh" }}
                />
              ) : contentType.startsWith("text/") ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0 bg-white"
                  title={fileName}
                  style={{ minHeight: "70vh" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
                    <p className="text-neutral-400 mb-4">Preview not available for this file type</p>
                    <Button
                      onClick={() => onDownload(fileUrl, fileName)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
