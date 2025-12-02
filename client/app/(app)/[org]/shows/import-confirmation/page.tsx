import { getCachedOrg } from "@/lib/cache";
import { notFound } from "next/navigation";
import type { ImportData } from "@/components/import/types";
import { getImportJobById, ImportJobStatus } from "@/lib/import/jobs";
import { ImportConfirmationClient } from "./import-confirmation-client";

interface PageProps {
  params: Promise<{ org: string }>;
  searchParams?: Promise<{ jobId?: string }>;
}

export default async function ImportConfirmationPage({ params, searchParams }: PageProps) {
  const { org: orgSlug } = await params;
  const jobId = (await searchParams)?.jobId;

  const { data: orgData, error } = await getCachedOrg(orgSlug);
  if (error || !orgData) {
    notFound();
  }

  let initialData: Partial<ImportData> | undefined;
  let confidenceMap: Record<string, import("@/lib/import/jobs").ConfidenceEntry> | undefined;
  let initialJobStatus: ImportJobStatus | undefined;
  let rawSources: Array<{ id: string; fileName: string }> | undefined;

  if (jobId) {
    const job = await getImportJobById(jobId);
    if (job) {
      initialJobStatus = job.status;
      if (job.extracted) {
        initialData = job.extracted as ImportData;
      }
      if (job.confidence_map) {
        confidenceMap = job.confidence_map;
      }
      if (job.raw_sources && Array.isArray(job.raw_sources)) {
        rawSources = job.raw_sources.map((s: any) => ({ id: s.id, fileName: s.fileName }));
      }
    }
  }

  return (
    <ImportConfirmationClient
      orgId={orgData.id}
      orgSlug={orgSlug}
      jobId={jobId || undefined}
      initialData={initialData}
      confidenceMap={confidenceMap}
      initialJobStatus={initialJobStatus}
      rawSources={rawSources}
    />
  );
}
