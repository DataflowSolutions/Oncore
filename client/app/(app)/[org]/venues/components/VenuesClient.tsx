"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";
import Link from "next/link";
import ViewHeader from "./ViewHeader";
import type { PromoterWithVenues } from "@/lib/actions/promoters";
import type { Database } from "@/lib/database.types";
import type { SeatCheckResult } from "@/lib/actions/invitations";
import AddPersonButton from "../../people/components/AddPersonButton";
import { AddPromoterModal } from "@/components/promoters/AddPromoterModal";
import { invitePerson } from "@/lib/actions/invitations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";
import TeamFilters from "./TeamFilters";
import type { TeamMemberFilterValue } from "@/lib/constants/team-filters";
import { AddVenueModal } from "@/components/venues/AddVenueModal";

interface Venue {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  capacity: number | null;
  contacts: unknown;
  created_at: string;
  shows?: Array<{ count: number }>;
}

type Person = Database["public"]["Tables"]["people"]["Row"];
type Invitation = Database["public"]["Tables"]["invitations"]["Row"] & {
  people: {
    id: string;
    name: string;
    email: string | null;
    role_title: string | null;
    member_type: "artist" | "crew" | "management" | "vendor" | "other" | null;
  };
};

interface VenuesClientProps {
  venues: Venue[];
  promoters: PromoterWithVenues[];
  people: Person[];
  invitations: Invitation[];
  seatInfo: SeatCheckResult | null;
  orgId: string;
  orgSlug: string;
  view: string;
}

export default function VenuesClient({
  venues,
  promoters,
  people,
  invitations,
  seatInfo,
  orgId,
  orgSlug,
  view,
}: VenuesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<TeamMemberFilterValue>("all");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [invitingPersonId, setInvitingPersonId] = useState<string | null>(null);

  // Filter venues based on search query
  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) {
      return venues;
    }

    const query = searchQuery.toLowerCase();

    return venues.filter((venue) => {
      const nameMatch = venue.name?.toLowerCase().includes(query);
      const cityMatch = venue.city?.toLowerCase().includes(query);
      const countryMatch = venue.country?.toLowerCase().includes(query);
      const addressMatch = venue.address?.toLowerCase().includes(query);

      return nameMatch || cityMatch || countryMatch || addressMatch;
    });
  }, [venues, searchQuery]);

  // Filter promoters based on search query
  const filteredPromoters = useMemo(() => {
    if (!searchQuery.trim()) {
      return promoters;
    }

    const query = searchQuery.toLowerCase();

    return promoters.filter((promoter) => {
      const nameMatch = promoter.name?.toLowerCase().includes(query);
      const companyMatch = promoter.company?.toLowerCase().includes(query);
      const cityMatch = promoter.city?.toLowerCase().includes(query);
      const emailMatch = promoter.email?.toLowerCase().includes(query);

      return nameMatch || companyMatch || cityMatch || emailMatch;
    });
  }, [promoters, searchQuery]);

  // Filter people based on search query and member type
  const filteredPeople = useMemo(() => {
    let filtered = people;

    // Apply member type filter
    if (activeFilter !== "all") {
      filtered = filtered.filter(
        (person) => person.member_type === activeFilter
      );
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((person) => {
        const nameMatch = person.name?.toLowerCase().includes(query);
        const emailMatch = person.email?.toLowerCase().includes(query);
        const phoneMatch = person.phone?.toLowerCase().includes(query);
        const roleMatch = person.role_title?.toLowerCase().includes(query);

        return nameMatch || emailMatch || phoneMatch || roleMatch;
      });
    }

    return filtered;
  }, [people, searchQuery, activeFilter]);

  // Create a map of person_id to invitation for quick lookup
  const invitationMap = new Map(invitations.map((inv) => [inv.person_id, inv]));

  const handleInvite = async (
    personId: string,
    personName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!seatInfo?.can_invite) {
      toast.error("No available seats", {
        description: "Upgrade your plan to invite more team members",
      });
      return;
    }

    setInvitingPersonId(personId);

    startTransition(async () => {
      const result = await invitePerson(personId);

      if (result.success) {
        toast.success("Invitation sent!", {
          description: `${personName} will receive an email to join the team`,
        });
        router.refresh();
      } else {
        toast.error("Failed to send invitation", {
          description: result.error || "Please try again",
        });
      }

      setInvitingPersonId(null);
    });
  };

  return (
    <>
      {view === "team" ? (
        // Team view
        <>
          <ViewHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            actionButton={<AddPersonButton orgId={orgId} />}
          />

          <TeamFilters
            people={people}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPeople.map((person) => {
              return (
                <div
                  key={person.id}
                  className="rounded-2xl border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between h-full">
                    {/* Left side: Name, phone, email */}
                    <div className="flex flex-col gap-2 flex-1">
                      <h4 className="font-header text-foreground">
                        {person.name}
                      </h4>
                      {person.phone && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span>{person.phone}</span>
                        </div>
                      )}
                      {person.email && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span className="break-all">{person.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Right side: Role and invite button */}
                    <div className="flex flex-col items-center justify-center gap-3">
                      {person.member_type && (
                        <Badge
                          variant="outline"
                          className="text-xs w-[84px] h-[24px] flex items-center justify-center"
                        >
                          {person.member_type}
                        </Badge>
                      )}
                      {!person.user_id &&
                        person.email &&
                        !invitationMap.has(person.id) && (
                          <Button
                            size="sm"
                            disabled={
                              !seatInfo?.can_invite ||
                              invitingPersonId === person.id
                            }
                            onClick={(e) =>
                              handleInvite(person.id, person.name, e)
                            }
                            className="rounded-full text-xs w-[84px] h-[24px] flex items-center justify-center"
                          >
                            {invitingPersonId === person.id
                              ? "Sending..."
                              : "Invite"}
                          </Button>
                        )}
                      {invitationMap.has(person.id) && (
                        <Badge
                          variant="secondary"
                          className="text-xs w-[84px] h-[24px] flex items-center justify-center"
                        >
                          Invited
                        </Badge>
                      )}
                      {person.user_id && (
                        <Badge
                          variant="default"
                          className="text-xs w-[84px] h-[24px] flex items-center justify-center"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : view === "promoters" ? (
        // Promoters view
        <>
          <ViewHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            actionButton={<AddPromoterModal orgId={orgId} />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPromoters.map((promoter) => {
              const venueCount = promoter.venues?.length || 0;

              return (
                <div
                  key={promoter.id}
                  className="rounded-2xl border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    {/* Left side: Name, location, company */}
                    <div className="flex flex-col gap-2 flex-1">
                      <h4 className="font-header text-foreground">
                        {promoter.name}
                      </h4>
                      {(promoter.city || promoter.country) && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span>
                            {promoter.city}
                            {promoter.city && promoter.country && ", "}
                            {promoter.country}
                          </span>
                        </div>
                      )}
                      {promoter.company && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span>{promoter.company}</span>
                        </div>
                      )}
                    </div>

                    {/* Right side: Email and phone */}
                    <div className="flex flex-col items-center justify-center gap-2">
                      {promoter.email && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span className="break-all">{promoter.email}</span>
                        </div>
                      )}
                      {promoter.phone && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span>{promoter.phone}</span>
                        </div>
                      )}
                      {venueCount > 0 && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {venueCount} venue{venueCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        // Venues view
        <>
          <ViewHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            actionButton={<AddVenueModal orgId={orgId} />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVenues.map((venue) => {
              const showCount = venue.shows?.[0]?.count || 0;

              return (
                <Link
                  key={venue.id}
                  href={`/${orgSlug}/venues/${venue.id}`}
                  className="block rounded-2xl border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    {/* Left side: Name, location */}
                    <div className="flex flex-col gap-2 flex-1">
                      <h4 className="font-header text-foreground">
                        {venue.name}
                      </h4>
                      {venue.city && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span>
                            {venue.city}
                            {venue.country && `, ${venue.country}`}
                          </span>
                        </div>
                      )}
                      {venue.address && (
                        <div className="flex items-center gap-2 text-sm text-description-foreground">
                          <span className="break-all">{venue.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Right side: Capacity and show count */}
                    <div className="flex flex-col items-center justify-center gap-2">
                      {venue.capacity && (
                        <Badge variant="outline" className="text-xs">
                          <Building className="w-3 h-3 mr-1" />
                          Cap. {venue.capacity}
                        </Badge>
                      )}
                      {showCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {showCount} show{showCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
