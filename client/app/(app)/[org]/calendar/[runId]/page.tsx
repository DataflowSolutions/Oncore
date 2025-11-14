import { notFound } from "next/navigation";
import { getCachedOrg } from "@/lib/cache";
import { getSyncRunItems } from "@/lib/actions/calendar-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SyncRunPage({
  params,
}: {
  params: Promise<{ org: string; runId: string }>;
}) {
  const { org: orgSlug, runId } = await params;
  
  const { data: org } = await getCachedOrg(orgSlug);
  if (!org) {
    return notFound();
  }

  const items = await getSyncRunItems({ orgId: org.id, runId });

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Link href={`/${orgSlug}/calendar`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Run Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} imported/updated
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No items found for this sync run.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.title}</h3>
                      {item.location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📍 {item.location}
                        </p>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Starts: {new Date(item.starts_at).toLocaleString()}
                        </span>
                        {item.ends_at && (
                          <span>
                            Ends: {new Date(item.ends_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    {item.external_calendar_id && (
                      <Badge variant="outline" className="shrink-0">
                        External
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
