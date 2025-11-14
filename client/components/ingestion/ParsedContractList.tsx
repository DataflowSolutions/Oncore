"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/lib/database.types";
import type { ParsedContract } from "@/lib/services/contract-parser";
import { updateParsedContractStatus } from "@/lib/actions/files";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusLabels: Record<ParsedContractRow["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "Pending review", variant: "secondary" },
  reviewed: { label: "Reviewed", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
};

type ParsedContractRow = Database["public"]["Tables"]["parsed_contracts"]["Row"];

interface ParsedContractListProps {
  orgId: string;
  contracts: ParsedContractRow[];
}

export function ParsedContractList({ orgId, contracts }: ParsedContractListProps) {
  const pending = useMemo(
    () => contracts.filter((contract) => contract.status === "pending_review"),
    [contracts],
  );
  const processed = useMemo(
    () => contracts.filter((contract) => contract.status !== "pending_review"),
    [contracts],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Contracts awaiting review</h2>
            <p className="text-sm text-muted-foreground">
              Approve parsed deals before they update advancing workflows.
            </p>
          </div>
          <Badge variant="secondary">{pending.length} pending</Badge>
        </header>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No contracts awaiting review.
              </CardContent>
            </Card>
          ) : (
            pending.map((contract) => (
              <PendingContractCard key={contract.id} contract={contract} orgId={orgId} />
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Reviewed contracts</h2>
            <p className="text-sm text-muted-foreground">Recent decisions and notes.</p>
          </div>
          <Badge variant="outline">{processed.length}</Badge>
        </header>
        <div className="space-y-4">
          {processed.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No reviewed contracts yet.
              </CardContent>
            </Card>
          ) : (
            processed.map((contract) => (
              <ReviewedContractCard key={contract.id} contract={contract} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PendingContractCard({
  contract,
  orgId,
}: {
  contract: ParsedContractRow;
  orgId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const parsed = (contract.parsed_data as ParsedContract | null) ?? undefined;
  const [notes, setNotes] = useState(contract.notes ?? "");

  const updateStatus = (status: "reviewed" | "rejected") => {
    startTransition(async () => {
      const result = await updateParsedContractStatus({
        orgId,
        contractId: contract.id,
        status,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Unable to update contract status");
        return;
      }

      toast.success(status === "reviewed" ? "Contract approved" : "Contract rejected");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{contract.file_name || "Untitled contract"}</CardTitle>
          <CardDescription className="text-xs">
            Uploaded {format(new Date(contract.created_at), "MMM d, yyyy 'at' h:mm a")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusLabels[contract.status].variant}>
            {statusLabels[contract.status].label}
          </Badge>
          {typeof contract.confidence === "number" ? (
            <Badge variant="outline">Confidence {(contract.confidence * 100).toFixed(0)}%</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {contract.file_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={contract.file_url} target="_blank" rel="noreferrer">
              View original file
            </a>
          </Button>
        ) : null}

        {contract.error ? (
          <p className="text-destructive">{contract.error}</p>
        ) : null}

        <ContractDetails parsed={parsed} />

        <div className="space-y-2">
          <Label htmlFor={`${contract.id}-notes`}>Reviewer notes</Label>
          <Textarea
            id={`${contract.id}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Add context for the advancing team"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => updateStatus("reviewed")} disabled={isPending}>
            {isPending ? "Saving…" : "Mark as reviewed"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => updateStatus("rejected")}
            disabled={isPending}
          >
            Reject contract
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewedContractCard({ contract }: { contract: ParsedContractRow }) {
  const parsed = (contract.parsed_data as ParsedContract | null) ?? undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{contract.file_name || "Untitled contract"}</CardTitle>
          <CardDescription className="text-xs">
            Parsed {format(new Date(contract.created_at), "MMM d, yyyy 'at' h:mm a")}
          </CardDescription>
        </div>
        <Badge variant={statusLabels[contract.status].variant}>
          {statusLabels[contract.status].label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ContractDetails parsed={parsed} />
        {contract.notes ? <p className="text-muted-foreground">Notes: {contract.notes}</p> : null}
        {contract.file_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={contract.file_url} target="_blank" rel="noreferrer">
              View file
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ContractDetails({ parsed }: { parsed?: ParsedContract }) {
  if (!parsed) {
    return <p className="text-muted-foreground">No structured data available.</p>;
  }

  const showDetails = [
    { label: "Show", value: parsed.showTitle },
    { label: "Date", value: parsed.showDate },
    { label: "Time", value: parsed.showTime },
    { label: "Venue", value: parsed.venueName },
  ];

  const financials = [
    { label: "Guarantee", value: parsed.guarantee },
    { label: "Backend", value: parsed.backendDeal },
    { label: "Ticket price", value: parsed.ticketPrice },
    { label: "Deposit", value: parsed.depositAmount },
  ];

  const contacts = [
    { label: "Promoter", value: parsed.promoterName },
    { label: "Promoter email", value: parsed.promoterEmail },
    { label: "Venue contact", value: parsed.venueContactEmail },
  ];

  return (
    <div className="space-y-4">
      <DetailSection title="Show details" rows={showDetails} />
      <DetailSection title="Financials" rows={financials} />
      <DetailSection title="Contacts" rows={contacts} />

      {parsed.hospitality || parsed.merchandising || parsed.recording ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Additional terms</h4>
          <ScrollArea className="max-h-40 rounded-md border">
            <div className="space-y-3 p-4 text-sm">
              {parsed.hospitality ? (
                <p>
                  <span className="font-medium">Hospitality: </span>
                  {parsed.hospitality}
                </p>
              ) : null}
              {parsed.merchandising ? (
                <p>
                  <span className="font-medium">Merchandising: </span>
                  {parsed.merchandising}
                </p>
              ) : null}
              {parsed.recording ? (
                <p>
                  <span className="font-medium">Recording: </span>
                  {parsed.recording}
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}

function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value?: string | null }[];
}) {
  const visible = rows.filter((row) => row.value);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        {visible.map((row) => (
          <div key={row.label} className="flex flex-col">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
