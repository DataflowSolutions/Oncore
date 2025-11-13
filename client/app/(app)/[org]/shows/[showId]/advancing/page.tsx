import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { getAdvancingSessions } from "@/lib/actions/advancing";
import { getCachedOrg, getCachedShow } from "@/lib/cache";

interface AdvancingPageProps {
  params: Promise<{ org: string; showId: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
}

export default async function AdvancingPage({ params }: AdvancingPageProps) {
  const { org: orgSlug, showId } = await params;

  const { data: org, error: orgError } = await getCachedOrg(orgSlug);

  if (orgError || !org) {
    return <div>Organization not found</div>;
  }

  // Get show details using cached function
  const { data: show, error: showError } = await getCachedShow(showId);

  if (showError || !show || show.org_id !== org.id) {
    return <div>Show not found</div>;
  }

  const sessions = await getAdvancingSessions(orgSlug);

  // Filter sessions by this show
  const filteredSessions = sessions.filter(
    (session: { show_id: string }) => session.show_id === showId
  );

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/${orgSlug}/shows/${showId}/advancing/new`}>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Link>
        </Button>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No advancing sessions yet for this show
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Create an advancing session to collaborate with the venue on
                technical details, hospitality, and show requirements.
              </p>
              <Button asChild>
                <Link href={`/${orgSlug}/shows/${showId}/advancing/new`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Session
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSessions.map(
              (session: {
                id: string;
                title: string;
                created_at: string;
                expires_at: string | null;
              }) => (
                <Card
                  key={session.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg line-clamp-1">
                        {session.title}
                      </CardTitle>
                      <Badge
                        variant={session.expires_at ? "default" : "secondary"}
                      >
                        {session.expires_at ? "Active" : "No Expiry"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Session Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created</span>
                        <span>
                          {new Date(session.created_at).toLocaleDateString(
                            "en-US"
                          )}
                        </span>
                      </div>

                      {session.expires_at && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Expires</span>
                          <span>
                            {new Date(session.expires_at).toLocaleDateString(
                              "en-US"
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" className="flex-1">
                        <Link
                          href={`/${orgSlug}/shows/${showId}/advancing/${session.id}`}
                        >
                          Open Session
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
