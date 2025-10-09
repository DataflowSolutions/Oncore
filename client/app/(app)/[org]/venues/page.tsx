import { getSupabaseServer } from "@/lib/supabase/server";
import { getVenuesWithShowCounts } from "@/lib/actions/venues";
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

  // Get venues with show counts using server action
  const allVenues = await getVenuesWithShowCounts(org.id);

  return (
    <div className="mb-16 mt-4">
      <VenuesClient venues={allVenues} orgSlug={orgSlug} view={view} />
    </div>
  );
}
