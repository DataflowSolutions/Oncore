import ShowsSearchbar from "./components/ShowsSearchbar";
import ShowsTable from "./components/ShowsTable";
import ShowViewToggler from "./components/ShowViewToggler";
import CreateShowButton from "./components/CreateShowButton";
import { getSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface ShowsPageProps {
  params: Promise<{ org: string }>
}

export default async function ShowsPage({ params }: ShowsPageProps) {
  const { org: orgSlug } = await params
  
  // Get the actual organization ID from the slug
  const supabase = await getSupabaseServer()
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single()

  if (error || !org) {
    notFound()
  }
  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-end gap-4">
        <ShowViewToggler />
        <CreateShowButton orgId={org.id} />
      </div>
      <ShowsSearchbar />
      <ShowsTable orgId={org.id} />
    </div>
  );
}
