import { getSupabaseServer } from "@/lib/supabase/server";
import { getVenueDetails } from "@/lib/actions/venues";
import { getPromotersByVenue } from "@/lib/actions/promoters";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import VenueClient from "./components/VenueClient";

interface VenueDetailPageProps {
  params: Promise<{ org: string; venueId: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function VenueDetailPage({
  params,
  searchParams,
}: VenueDetailPageProps) {
  const { org: orgSlug, venueId } = await params;
  const { view = "details" } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!org) {
    return <div>Organization not found</div>;
  }

  try {
    // Fetch venue details and promoters in parallel
    const [{ venue, shows }, promotersResult] = await Promise.all([
      getVenueDetails(venueId),
      getPromotersByVenue(venueId),
    ]);

    // Verify venue belongs to this org
    if (venue.org_id !== org.id) {
      notFound();
    }

    const promoters = promotersResult.success ? promotersResult.data || [] : [];

    return (
      <div className="mb-16 mt-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/${orgSlug}/venues`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Venues
            </Button>
          </Link>
        </div>

        <VenueClient
          venue={venue}
          shows={shows}
          promoters={promoters}
          orgSlug={orgSlug}
          view={view}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading venue details:", error);
    notFound();
  }
}
