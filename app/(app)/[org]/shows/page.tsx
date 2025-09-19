import ShowsSearchbar from "./components/ShowsSearchbar";
import ShowsTable from "./components/ShowsTable";
import ShowViewToggler from "./components/ShowViewToggler";
import { Plus } from "lucide-react";

export default function ShowsPage() {
  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-end gap-4">
        <ShowViewToggler />
        <button className="inline-flex items-center justify-center gap-4 text-sm font-semibold ring-offset-background  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-foreground text-background hover:bg-foreground/90 px-4 rounded-md cursor-pointer hover:scale-[1.05] transition-all">
          <Plus className="h-4 w-4" />
          Create Show
        </button>
      </div>
      <ShowsSearchbar />
      <ShowsTable />
    </div>
  );
}
