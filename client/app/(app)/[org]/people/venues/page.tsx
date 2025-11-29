import { getSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSectionContainer } from "@/components/ui/CardSectionContainer";
import { Badge } from "@/components/ui/badge";
import { MapPin, FileText, Globe, Calendar } from "lucide-react";

interface VenuesPageProps {
  params: Promise<{ org: string }>;
}

interface Venue {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  capacity: number | null;
  contacts: any | null;
  created_at: string;
  org_id: string;
  shows?: { count: number }[];
}

export default async function VenuesPage({ params }: VenuesPageProps) {
  const { org: orgSlug } = await params;

  const supabase = await getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc("get_org_by_slug", {
    p_slug: orgSlug,
  });

  if (!org) {
    return <div>Organization not found</div>;
  }

  // Get venues from the venues table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawVenues } = await (supabase as any)
    .from("venues")
    .select(
      `
      *,
      shows:shows(count)
    `
    )
    .eq("org_id", org.id)
    .order("name");

  const venues = (rawVenues || []) as Venue[];
  const allVenues = venues;

  // Get show counts
  const totalShows = allVenues.reduce(
    (sum, venue) => sum + (venue.shows?.[0]?.count || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <CardSectionContainer>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{allVenues.length}</p>
                <p className="text-xs text-muted-foreground">Total Venues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalShows}</p>
                <p className="text-xs text-muted-foreground">Total Shows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {allVenues.filter((v) => v.city).length}
                </p>
                <p className="text-xs text-muted-foreground">Cities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardSectionContainer>

      {/* All Venues */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <CardTitle className="text-lg">
              All Venues ({allVenues.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allVenues.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No venues added yet. Add your first venue to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allVenues.map((venue) => {
                const showCount = venue.shows?.[0]?.count || 0;
                return (
                  <div
                    key={venue.id}
                    className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 sm:p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Header with name and badges */}
                      <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-foreground text-base">
                          {venue.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {showCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {showCount} show{showCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {venue.capacity && (
                            <Badge variant="outline" className="text-xs">
                              Cap. {venue.capacity}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Location information */}
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        {venue.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              {venue.city}
                              {venue.country && `, ${venue.country}`}
                            </span>
                          </div>
                        )}
                        {venue.address && (
                          <div className="flex items-start gap-1.5">
                            <Globe className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{venue.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Contact info */}
                      {venue.contacts && (
                        <div className="flex items-start gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                          <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>Contact info available</span>
                        </div>
                      )}

                      {/* Footer with date */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground">
                          Added{" "}
                          {new Date(venue.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
