import { notFound } from "next/navigation";
import { getCachedOrg } from "@/lib/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type HistoryRow = {
  id: string;
  status: string;
  created_at: string;
  metadata?: { name?: string; size?: number };
  candidate_count: number;
  errors?: string[];
};

interface PageProps {
  params: Promise<{ org: string }>;
}

export default async function ImportHistoryPage({ params }: PageProps) {
  const { org: orgSlug } = await params;
  const { data: org } = await getCachedOrg(orgSlug);
  if (!org) notFound();

  const res = await fetch(`/api/shows/import/history?orgId=${org.id}`, {
    cache: "no-store",
  });
  const json = await res.json();
  const rows: HistoryRow[] = json.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import History</h1>
          <p className="text-sm text-muted-foreground">Previous imports for this organization.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <div className="grid grid-cols-6 gap-3 text-sm font-medium text-muted-foreground border-b pb-2">
              <span>File</span>
              <span>Date</span>
              <span>Candidates</span>
              <span>Status</span>
              <span>Errors</span>
              <span>Action</span>
            </div>
          )}

          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-6 gap-3 text-sm items-center border-b pb-2">
                <span className="font-medium text-foreground truncate">{row.metadata?.name ?? "Pasted text"}</span>
                <span>{new Date(row.created_at).toLocaleString()}</span>
                <span>{row.candidate_count}</span>
                <span>
                  <StatusBadge status={row.status} />
                </span>
                <span className="text-destructive">
                  {row.errors && row.errors.length > 0 ? `${row.errors.length} error(s)` : "—"}
                </span>
                <Link href={`/${orgSlug}/shows/import-history/${row.id}`} className="text-primary underline">
                  View details
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "secondary" : status === "needs_review" ? "outline" : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}
