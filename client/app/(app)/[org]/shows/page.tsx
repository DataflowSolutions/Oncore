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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">Shows</h1>
          <p className="text-muted-foreground mt-1">Manage your tour schedule</p>
        </div>
        <CreateShowButton orgId={org.id} />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <ShowsSearchbar />
        </div>
        <ShowViewToggler />
      </div>
      
      <ShowsTable orgId={org.id} orgSlug={orgSlug} />
    </div>
  );
}
