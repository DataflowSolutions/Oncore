import { Search } from "lucide-react";
import VenueViewToggler from "./VenueViewToggler";

interface ViewHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  actionButton: React.ReactNode;
}

export default function ViewHeader({
  searchQuery,
  onSearchChange,
  actionButton,
}: ViewHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-10 gap-20">
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 bg-search-bg px-10 py-2 border border-search-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <VenueViewToggler />
      </div>
      {actionButton}
    </div>
  );
}
