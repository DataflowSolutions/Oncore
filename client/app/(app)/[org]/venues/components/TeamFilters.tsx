import React from "react";
import { Button } from "@/components/ui/button";
import {
  TEAM_MEMBER_FILTERS,
  type TeamMemberFilterValue,
} from "@/lib/constants/team-filters";
import type { Database } from "@/lib/database.types";

type Person = Database["public"]["Tables"]["people"]["Row"];

interface TeamFiltersProps {
  people: Person[];
  activeFilter: TeamMemberFilterValue;
  onFilterChange: (filter: TeamMemberFilterValue) => void;
}

export default function TeamFilters({
  people,
  activeFilter,
  onFilterChange,
}: TeamFiltersProps) {
  // Calculate counts for each filter
  const getCounts = () => {
    const counts: Record<string, number> = {
      all: people.length,
      Artist: 0,
      Agent: 0,
      Manager: 0,
      Crew: 0,
    };

    people.forEach((person) => {
      if (person.member_type) {
        counts[person.member_type] = (counts[person.member_type] || 0) + 1;
      }
    });

    return counts;
  };

  const counts = getCounts();

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {TEAM_MEMBER_FILTERS.map((filter) => {
        const count = counts[filter.value] || 0;
        const isActive = activeFilter === filter.value;

        return (
          <Button
            key={filter.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className="rounded-full px-10 py-5 font-header"
          >
            {filter.label} ({count})
          </Button>
        );
      })}
    </div>
  );
}
