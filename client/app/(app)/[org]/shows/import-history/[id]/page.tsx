import { notFound } from "next/navigation";
import { getCachedOrg } from "@/lib/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import ImportRetryButton from "@/components/shows/ImportRetryButton";
import ImproveExtractionButton from "@/components/shows/ImproveExtractionButton";

interface PageProps {
  params: Promise<{ org: string; id: string }>;
}

export default async function ImportDetailsPage({ params }: PageProps) {
  const { org: orgSlug, id } = await params;
  const { data: org } = await getCachedOrg(orgSlug);
  if (!org) notFound();

  const res = await fetch(`/api/shows/import/${id}?orgId=${org.id}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.data) notFound();
  const job = json.data;

  const candidates = (job.parsed_json?.candidates as any[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Details</h1>
          <p className="text-sm text-muted-foreground">Import ID: {job.id}</p>
        </div>
        <div className="flex gap-2">
          <ImproveExtractionButton orgId={org.id} jobId={job.id} />
          <ImportRetryButton orgId={org.id} jobId={job.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <Badge variant={job.status === "completed" ? "secondary" : job.status === "needs_review" ? "outline" : "destructive"}>
              {job.status}
            </Badge>
          </div>
          <div>Created: {new Date(job.created_at).toLocaleString()}</div>
          <div>Source: {job.source_file_metadata?.name ?? "Pasted text"}</div>
          <div>Extraction mode: {job.extraction_mode ?? "rule_based"}</div>
          <div>Confidence entries: {job.confidence_map ? Object.keys(job.confidence_map).length : 0}</div>
          <div className="text-destructive">
            {job.errors && job.errors.length > 0 ? `${job.errors.length} error(s)` : "No errors recorded"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Raw & Normalized Text</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <PreviewBlock title="Raw Text" content={job.raw_text} />
          <PreviewBlock title="Normalized Text" content={job.normalized_text} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {candidates.map((candidate) => (
          <Card key={candidate.candidateId} className="border">
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-lg">{candidate.title || "Untitled"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {candidate.date || "Date TBD"} {candidate.venueName ? `• ${candidate.venueName}` : ""}{" "}
                  {candidate.city ? `• ${candidate.city}` : ""}
                </p>
              </div>
              {candidate.showId ? (
                <Link className="text-primary underline text-sm" href={`/${orgSlug}/shows/${candidate.showId}`}>
                  View show
                </Link>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Artist" value={candidate.structured?.core?.artist?.value} />
                <Field label="Fee" value={candidate.structured?.deal?.fee?.value} />
                <Field label="Deal" value={candidate.structured?.deal?.dealType?.value} />
                <Field label="Payment Terms" value={candidate.structured?.deal?.paymentTerms?.value} />
              </div>

              {candidate.duplicates && candidate.duplicates.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <div className="font-semibold text-sm text-amber-700">Possible duplicates</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {candidate.duplicates.map((dup: any) => (
                      <li key={dup.id}>
                        {dup.title || "Untitled"} — {dup.date} {dup.venue ? `• ${dup.venue}` : ""}{" "}
                        {dup.city ? `• ${dup.city}` : ""} (score {dup.score})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {job.errors && job.errors.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-destructive">
            {job.errors.map((err: string, idx: number) => (
              <div key={`${err}-${idx}`}>{err}</div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PreviewBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <ScrollArea className="h-64 rounded-md border bg-muted/40 p-3">
        <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground">{content || "No content"}</pre>
      </ScrollArea>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="text-sm">
      <span className="font-medium">{label}: </span>
      <span className="text-muted-foreground">{value || "—"}</span>
    </div>
  );
}
