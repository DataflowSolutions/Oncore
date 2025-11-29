"use client";

import { useRouter } from "next/navigation";
import { ImportConfirmationPage } from "@/components/import";
import { createEmptyImportData } from "@/components/import";

interface ImportConfirmationClientProps {
  orgId: string;
  orgSlug: string;
  jobId?: string;
}

/**
 * Client component that renders the import confirmation page
 * Currently uses empty data - will be connected to import pipeline later
 */
export function ImportConfirmationClient({
  orgId,
  orgSlug,
  jobId,
}: ImportConfirmationClientProps) {
  const router = useRouter();

  const handleCancel = () => {
    router.push(`/${orgSlug}/shows`);
  };

  return (
    <ImportConfirmationPage
      orgId={orgId}
      orgSlug={orgSlug}
      initialData={createEmptyImportData()}
      jobId={jobId}
      onCancel={handleCancel}
    />
  );
}
