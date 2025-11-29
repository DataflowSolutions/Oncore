"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImportJobStatus } from "@/lib/import/jobs";

interface ImportJobRecordLite {
  status?: ImportJobStatus;
}

/**
 * Small status chip that appears in the TopBar when an import job is in progress.
 * Reads jobId from the current search params and polls until the job finishes.
 */
export function ImportJobStatusBadge() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [status, setStatus] = useState<ImportJobStatus | undefined>(undefined);

  useEffect(() => {
    if (!jobId) {
      setStatus(undefined);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/import-jobs/${jobId}`);
        if (!res.ok) return;
        const job: ImportJobRecordLite = await res.json();
        if (cancelled) return;
        if (job.status) {
          setStatus(job.status);
          if (job.status === "completed" || job.status === "failed") {
            clearInterval(interval);
          }
        }
      } catch {
        // ignore
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId]);

  if (!jobId || !status) return null;
  if (status !== "pending" && status !== "processing") return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "hidden sm:inline-flex items-center gap-2 rounded-full text-xs",
        "border-amber-400/70 text-amber-900 bg-amber-50"
      )}
    >
      <span className="h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      Import processing...
    </Badge>
  );
}
