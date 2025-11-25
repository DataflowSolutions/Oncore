"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  orgId: string;
  jobId: string;
}

export default function ImportRetryButton({ orgId, jobId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      const res = await fetch(`/api/shows/import/${jobId}/retry?orgId=${orgId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Retry failed");
        return;
      }
      toast.success("Import retried");
      window.location.reload();
    });
  };

  return (
    <Button variant="outline" onClick={handleRetry} disabled={isPending}>
      {isPending ? "Retrying..." : "Retry Import"}
    </Button>
  );
}
