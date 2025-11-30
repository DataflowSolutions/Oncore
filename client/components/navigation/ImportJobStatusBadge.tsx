"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportJobStatus } from "@/lib/import/jobs";

interface ImportJobRecordLite {
  id: string;
  status?: ImportJobStatus;
  org_id?: string;
}

const STORAGE_KEY_PREFIX = "oncore_active_import_";

/**
 * Persistent status indicator that appears in the TopBar when an import job is active.
 * Stores active job ID in localStorage per org, visible across all pages.
 * Only clears when user cancels or completes the import (saves show).
 */
export function ImportJobStatusBadge() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.org as string | undefined;
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportJobStatus | undefined>(undefined);

  // Load active job from localStorage on mount
  useEffect(() => {
    if (!orgSlug) return;
    const storageKey = `${STORAGE_KEY_PREFIX}${orgSlug}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setJobId(stored);
    }

    // Listen for storage events from other tabs/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setJobId(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [orgSlug]);

  // Poll job status
  useEffect(() => {
    if (!jobId || !orgSlug) {
      setStatus(undefined);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/import-jobs/${jobId}`);
        if (!res.ok) {
          // Job not found or error - clear it
          if (res.status === 404) {
            clearActiveJob();
          }
          return;
        }
        const job: ImportJobRecordLite = await res.json();
        if (cancelled) return;

        setStatus(job.status);

        // If job is committed (user saved show), clear from localStorage
        if (job.status === "committed") {
          clearActiveJob();
        }
      } catch {
        // Network error - keep showing status
      }
    };

    poll();
    const interval = setInterval(poll, 3000); // Poll every 3 seconds
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, orgSlug]);

  const clearActiveJob = () => {
    if (!orgSlug) return;
    const storageKey = `${STORAGE_KEY_PREFIX}${orgSlug}`;
    localStorage.removeItem(storageKey);
    setJobId(null);
    setStatus(undefined);
  };

  const handleCancel = () => {
    clearActiveJob();
  };

  const handleViewJob = () => {
    if (!jobId || !orgSlug) return;
    router.push(`/${orgSlug}/shows/import-confirmation?jobId=${jobId}`);
  };

  if (!jobId || !status) return null;

  // Show for pending, processing, completed, or failed (not for committed)
  if (status === "committed") return null;

  const isProcessing = status === "pending" || status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
        isProcessing && "border-blue-400/70 text-blue-900 bg-blue-50",
        isCompleted && "border-green-400/70 text-green-900 bg-green-50",
        isFailed && "border-red-400/70 text-red-900 bg-red-50"
      )}
    >
      {isProcessing && (
        <span className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
      {isFailed && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}

      <span>
        {isProcessing && "Import processing..."}
        {isCompleted && "Import ready"}
        {isFailed && "Import failed"}
      </span>

      {(isCompleted || isFailed) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-xs hover:bg-white/50"
          onClick={handleViewJob}
        >
          View
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 hover:bg-white/50"
        onClick={handleCancel}
        title="Dismiss"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * Helper to set active import job in localStorage (call after creating job)
 */
export function setActiveImportJob(orgSlug: string, jobId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${orgSlug}`;
  localStorage.setItem(storageKey, jobId);
  // Trigger storage event for current window
  window.dispatchEvent(new StorageEvent("storage", {
    key: storageKey,
    newValue: jobId,
  }));
}
