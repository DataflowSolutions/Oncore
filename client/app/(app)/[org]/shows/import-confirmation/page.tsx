import { getCachedOrg } from "@/lib/cache";
import { notFound } from "next/navigation";
import { ImportConfirmationClient } from "./import-confirmation-client";

interface PageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ jobId?: string }>;
}

export default async function ImportConfirmationPage({ params, searchParams }: PageProps) {
  const { org } = await params;
  const { jobId } = await searchParams;

  const { data: orgData, error } = await getCachedOrg(org);
  
  if (error || !orgData) {
    notFound();
  }

  return (
    <ImportConfirmationClient
      orgId={orgData.id}
      orgSlug={org}
      jobId={jobId}
    />
  );
}
