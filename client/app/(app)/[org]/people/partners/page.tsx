import { getSupabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSectionContainer } from "@/components/ui/CardSectionContainer";
import { Badge } from "@/components/ui/badge";
import {
  Handshake,
  Mail,
  Phone,
  FileText,
  Building2,
  Users,
} from "lucide-react";

interface PartnersPageProps {
  params: Promise<{ org: string }>;
}

interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  member_type: string | null;
  created_at: string;
  org_id: string;
}

export default async function PartnersPage({ params }: PartnersPageProps) {
  const { org: orgSlug } = await params;

  const supabase = await getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any).rpc("get_org_by_slug", {
    p_slug: orgSlug,
  });

  if (!org) {
    return <div>Organization not found</div>;
  }

  // For now, we'll get external partners from the people table
  // We'll use notes or a future partner-specific table to distinguish them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawPartners } = await (supabase as any)
    .from("people")
    .select("*")
    .eq("org_id", org.id)
    .or("notes.ilike.%partner%,notes.ilike.%vendor%,notes.ilike.%external%")
    .order("name");

  const partners = (rawPartners || []) as Partner[];
  const allPartners = partners;

  // For now, we'll categorize based on notes content until we have proper partner types
  const externalPartners = allPartners.filter(
    (partner) =>
      partner.notes?.toLowerCase().includes("external") ||
      partner.notes?.toLowerCase().includes("partner")
  );

  const vendors = allPartners.filter((partner) =>
    partner.notes?.toLowerCase().includes("vendor")
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <CardSectionContainer>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{allPartners.length}</p>
                <p className="text-xs text-muted-foreground">Total Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{externalPartners.length}</p>
                <p className="text-xs text-muted-foreground">
                  External Partners
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{vendors.length}</p>
                <p className="text-xs text-muted-foreground">Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardSectionContainer>

      {/* All Partners */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            <CardTitle className="text-lg">
              All Partners ({allPartners.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allPartners.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No partners added yet. Add external collaborators and vendors to
                get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPartners.map((partner) => {
                const isVendor = partner.notes
                  ?.toLowerCase()
                  .includes("vendor");
                return (
                  <div
                    key={partner.id}
                    className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 sm:p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Header with name and badges */}
                      <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-foreground text-base">
                          {partner.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {partner.member_type && (
                            <Badge
                              variant={isVendor ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {isVendor ? (
                                <Users className="w-3 h-3 mr-1" />
                              ) : (
                                <Building2 className="w-3 h-3 mr-1" />
                              )}
                              {partner.member_type}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Contact information */}
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        {partner.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="break-all">{partner.email}</span>
                          </div>
                        )}
                        {partner.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{partner.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {partner.notes && (
                        <div className="flex items-start gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                          <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{partner.notes}</span>
                        </div>
                      )}

                      {/* Footer with date */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground">
                          Added{" "}
                          {new Date(partner.created_at).toLocaleDateString(
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
