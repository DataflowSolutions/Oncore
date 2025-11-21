export const TEAM_MEMBER_FILTERS = [
  { value: "all", label: "All" },
  { value: "Artist", label: "Artists" },
  { value: "Agent", label: "Agents" },
  { value: "Manager", label: "Managers" },
  { value: "Crew", label: "Crew" },
] as const;

export type TeamMemberFilterValue =
  (typeof TEAM_MEMBER_FILTERS)[number]["value"];
