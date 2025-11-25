"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  orgId: string;
  jobId: string;
}

export default function ImproveExtractionButton({ orgId, jobId }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleImprove = () => {
    startTransition(async () => {
      const res = await fetch(`/api/shows/import/${jobId}/ai-enhance?orgId=${orgId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "AI enhancement failed");
        return;
      }
      toast.success("Extraction improved");
      window.location.reload();
    });
  };

  return (
    <Button variant="secondary" onClick={handleImprove} disabled={isPending}>
      {isPending ? "Improving..." : "Improve Extraction (AI)"}
    </Button>
  );
}
