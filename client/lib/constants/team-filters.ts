export const TEAM_MEMBER_FILTERS = [
  { value: "all", label: "All" },
  { value: "artist", label: "Artists" },
  { value: "management", label: "Manager" },
  { value: "crew", label: "Crew" },
  { value: "vendor", label: "Vendors" },
  { value: "other", label: "Other" },
] as const;

export type TeamMemberFilterValue =
  (typeof TEAM_MEMBER_FILTERS)[number]["value"];
