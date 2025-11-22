import { Search } from "lucide-react";
import React from "react";

interface ShowsSearchbarProps {
  value: string;
  onChange: (value: string) => void;
}

const ShowsSearchbar = ({ value, onChange }: ShowsSearchbarProps) => {
  return (
    <div className="relative my-6">
      <Search className="absolute  left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <input
        type="text"
        placeholder="Search shows, artists, venues, cities..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className=" h-10 bg-search-bg px-10 py-2 border border-search-border rounded-full w-[500px]"
      />
    </div>
  );
};

export default ShowsSearchbar;
