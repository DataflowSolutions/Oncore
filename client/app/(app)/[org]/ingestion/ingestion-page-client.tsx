"use client";
import { ParseEmailForm } from "@/components/ingestion/ParseEmailForm";
import { ParsedEmailList } from "@/components/ingestion/ParsedEmailList";
import { ParsedContractList } from "@/components/ingestion/ParsedContractList";
import { useParsedEmails, useParsedContracts } from "@/lib/hooks/use-ingestion";
import { useVenues } from "@/lib/hooks/use-venues";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface IngestionPageClientProps {
  orgSlug: string;
  orgId: string;
}

export function IngestionPageClient({ orgSlug, orgId }: IngestionPageClientProps) {
  const { data: emails = [], isLoading: emailsLoading } = useParsedEmails(orgSlug);
  const { data: contracts = [], isLoading: contractsLoading } = useParsedContracts(orgSlug);
  const { data: venues = [], isLoading: venuesLoading } = useVenues(orgSlug);

  const showEmailSkeleton = (emailsLoading || venuesLoading) && emails.length === 0;
  const showContractSkeleton = contractsLoading && contracts.length === 0;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Ingestion inbox</h1>
          <p className="text-sm text-muted-foreground">
            Review AI-parsed emails and contracts before they update your tour.
          </p>
        </div>
        <ParseEmailForm orgId={orgId} />
      </section>

      <section>
        {showEmailSkeleton ? <LoadingCard /> : null}
        {!showEmailSkeleton ? (
          <ParsedEmailList orgId={orgId} orgSlug={orgSlug} emails={emails} venues={venues} />
        ) : null}
      </section>

      <section>
        {showContractSkeleton ? <LoadingCard /> : null}
        {!showContractSkeleton ? (
          <ParsedContractList orgId={orgId} contracts={contracts} />
        ) : null}
      </section>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  );
}
