import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getCachedOrg, getCachedOrgVenues } from "@/lib/cache";
import { queryKeys } from "@/lib/query-keys";
import { getParsedEmails } from "@/lib/actions/email";
import { getParsedContracts } from "@/lib/actions/files";
import { IngestionPageClient } from "./ingestion-page-client";

interface IngestionPageProps {
  params: Promise<{ org: string }>;
}

export default async function IngestionPage({ params }: IngestionPageProps) {
  const { org: orgSlug } = await params;

  const { data: org } = await getCachedOrg(orgSlug);
  if (!org) {
    notFound();
  }

  const queryClient = new QueryClient();

  const [venuesResult, emails, contracts] = await Promise.all([
    getCachedOrgVenues(org.id),
    getParsedEmails(org.id),
    getParsedContracts(org.id),
  ]);

  queryClient.setQueryData(queryKeys.venues(orgSlug), venuesResult.data ?? []);
  queryClient.setQueryData(queryKeys.parsedEmails(orgSlug), emails);
  queryClient.setQueryData(queryKeys.parsedContracts(orgSlug), contracts);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IngestionPageClient orgSlug={orgSlug} orgId={org.id} />
    </HydrationBoundary>
  );
}
