"use client";

import { useRouter } from "next/navigation";
import { ImportConfirmationPage } from "@/components/import";
import { createEmptyImportData } from "@/components/import";
import type { ImportData } from "@/components/import";
import type { ImportJobStatus } from "@/lib/import/jobs";

interface ImportConfirmationClientProps {
  orgId: string;
  orgSlug: string;
  jobId?: string;
  initialData?: Partial<ImportData>;
  confidenceMap?: Record<string, import("@/lib/import/jobs").ConfidenceEntry>;
  initialJobStatus?: ImportJobStatus;
  rawSources?: Array<{ id: string; fileName: string }>;
}

/**
 * Client component that renders the import confirmation page
 * Currently uses empty data - will be connected to import pipeline later
 */
export function ImportConfirmationClient({
  orgId,
  orgSlug,
  jobId,
  initialData,
  confidenceMap,
  initialJobStatus,
  rawSources,
}: ImportConfirmationClientProps) {
  const router = useRouter();

  const handleCancel = () => {
    router.push(`/${orgSlug}/shows`);
  };

  return (
    <ImportConfirmationPage
      orgId={orgId}
      orgSlug={orgSlug}
      initialData={initialData ?? createEmptyImportData()}
      confidenceMap={confidenceMap}
      initialJobStatus={initialJobStatus}
      jobId={jobId}
      rawSources={rawSources}
      onCancel={handleCancel}
    />
  );
}
