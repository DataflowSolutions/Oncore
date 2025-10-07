import ShowsClient from "./components/ShowsClient";
import CreateShowButton from "./components/CreateShowButton";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getShowsByOrg } from "@/lib/actions/shows";
import { notFound } from "next/navigation";

interface ShowsPageProps {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function ShowsPage({
  params,
  searchParams,
}: ShowsPageProps) {
  const { org: orgSlug } = await params;
  const { view = "list" } = await searchParams;

  // Get the actual organization ID from the slug
  const supabase = await getSupabaseServer();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (error || !org) {
    notFound();
  }

  // Fetch shows data
  const shows = await getShowsByOrg(org.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">Shows</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tour schedule
          </p>
        </div>
        <CreateShowButton orgId={org.id} />
      </div>

      <ShowsClient shows={shows} orgSlug={orgSlug} view={view} />
    </div>
  );
}
