import ShowsSearchbar from "./components/ShowsSearchbar";
import ShowsTable from "./components/ShowsTable";
import ShowViewToggler from "./components/ShowViewToggler";

export default function ShowsPage() {
  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-end">
        <ShowViewToggler />
      </div>
      <ShowsSearchbar />
      <ShowsTable />
    </div>
  );
}
