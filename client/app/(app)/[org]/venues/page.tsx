import { getSupabaseServer } from "@/lib/supabase/server";
import { getVenuesWithShowCounts } from "@/lib/actions/venues";
import { getPromotersByOrg } from "@/lib/actions/promoters";
import VenuesClient from "./components/VenuesClient";

interface VenuesPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function VenuesPage({
  params,
  searchParams,
}: VenuesPageProps) {
  const { org: orgSlug } = await params;
  const { view = "venues" } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!org) {
    return <div>Organization not found</div>;
  }

  // Get venues with show counts and promoters in parallel
  const [allVenues, allPromoters] = await Promise.all([
    getVenuesWithShowCounts(org.id),
    getPromotersByOrg(org.id),
  ]);

  return (
    <div className="mb-16 mt-4">
      <VenuesClient 
        venues={allVenues} 
        promoters={allPromoters}
        orgId={org.id}
        orgSlug={orgSlug} 
        view={view} 
      />
    </div>
  );
}
