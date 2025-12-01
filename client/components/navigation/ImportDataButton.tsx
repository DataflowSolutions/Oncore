"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setActiveImportJob } from "./ImportJobStatusBadge";

interface ImportDataButtonProps {
  orgId?: string;
  orgSlug?: string;
  className?: string;
}

/**
 * CTA button for launching an import. Opens a modal to paste raw text and
 * kicks off the import-start API. Immediately closes modal and shows status in topbar.
 */
export function ImportDataButton({ orgId, orgSlug, className }: ImportDataButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState("import.txt");
  const [rawText, setRawText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Temporarily disable imports until the flow is ready
  const importDisabled = true;
  const disabled = importDisabled || !orgId || !orgSlug;
  const disabledMessage = importDisabled ? "Import coming soon" : undefined;

  const handleStartImport = async () => {
    if (!orgId || !orgSlug) return;
    if (files.length === 0 && !rawText.trim()) {
      toast.error("Add text or attach at least one file");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare sources: user paste (if present) + any attached files
      const sources = await buildSources(files, rawText, fileName);

      const response = await fetch("/api/shows/import/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, sources }),
      });

      const result = await response.json();
      
      // Special handling for worker unavailable error
      if (!response.ok && result.code === "WORKER_UNAVAILABLE") {
        toast.error("Background worker is not running", {
          description: "Background worker is offline. Please try again later.",
          duration: 10000,
        });
        setIsSubmitting(false);
        return;
      }
      
      if (!response.ok || !result.jobId) {
        throw new Error(result.error || "Failed to start import");
      }

      console.log("[ImportDataButton] Job created:", result.jobId);

      // Store job ID in localStorage for persistent topbar indicator
      setActiveImportJob(orgSlug, result.jobId);
      console.log("[ImportDataButton] Job stored in localStorage");

      // Show success toast
      toast.success("Import started", {
        description: "Processing in background. Check the topbar for status.",
        duration: 4000,
      });

      // Reset state and close modal
      setRawText("");
      setFiles([]);
      setFileName("import.txt");
      setIsSubmitting(false);
      
      // Close modal after a brief delay to ensure state updates are processed
      setTimeout(() => {
        setOpen(false);
        console.log("[ImportDataButton] Modal closed, navigating...");
        // Navigate to confirmation page
        router.push(`/${orgSlug}/shows/import-confirmation?jobId=${result.jobId}`);
      }, 100);

    } catch (err) {
      console.error("[ImportDataButton] Import failed:", err);
      const message = err instanceof Error ? err.message : "Failed to start import";
      toast.error("Could not start import", { description: message });
      setIsSubmitting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles((prev) => [...prev, ...list]);
    // Reset input so selecting the same file again triggers change
    e.currentTarget.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const hasFiles = files.length > 0;

  function isTextLike(file: File): boolean {
    if (file.type && file.type.startsWith("text/")) return true;
    const lower = file.name.toLowerCase();
    return [".txt", ".md", ".csv", ".json", ".html", ".xml"].some((ext) => lower.endsWith(ext));
  }

  async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  async function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URL prefix to get pure base64
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  async function buildSources(files: File[], rawText: string, pasteName: string) {
    const sources: Array<{
      fileName: string;
      mimeType?: string;
      sizeBytes?: number;
      pageCount?: number;
      rawText: string;
      fileData?: string;
    }> = [];

    if (rawText.trim()) {
      sources.push({
        fileName: pasteName || "import.txt",
        mimeType: "text/x-user-paste",
        rawText,
      });
    }

    for (const f of files) {
      // For text files, read inline; for others, send base64 for server extraction
      let raw = "";
      let fileData: string | undefined;

      if (isTextLike(f)) {
        raw = await readFileAsText(f);
      } else {
        // Send file as base64 for server-side extraction
        fileData = await readFileAsBase64(f);
      }

      sources.push({
        fileName: f.name,
        mimeType: f.type || undefined,
        sizeBytes: f.size,
        rawText: raw,
        fileData,
      });
    }

    return sources;
  }

  return (
    <>
      <Button
        className={cn(
          "rounded-full font-header text-xs shrink-0",
          disabled && "opacity-70 cursor-not-allowed",
          className
        )}
        variant="secondary"
        disabled={disabled}
        title={disabledMessage}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
      >
        Import Data
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import data</DialogTitle>
            <DialogDescription>
              Paste raw text and/or attach files (PDFs, docs, images). We’ll extract hotels, flights, and more.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Attach files</label>
              <Input type="file" multiple onChange={onFileChange} />
              {hasFiles && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="inline-flex items-center gap-2 px-2 py-1 rounded-md border">
                      <span className="truncate max-w-[180px]">{f.name}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(i)}
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Non-text files may queue and process in the background.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">File name</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="import.txt"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Raw text</label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the relevant text here..."
                rows={8}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Large inputs will process in the background. Check the topbar for status.
              </p>
            </div>

            {isSubmitting && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">Starting import…</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleStartImport} disabled={isSubmitting || disabled}>
              {isSubmitting ? "Starting..." : "Start import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
