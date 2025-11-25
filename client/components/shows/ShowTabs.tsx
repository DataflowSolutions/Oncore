"use client";

import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { TeamMemberPopup } from "./TeamMemberPopup";

interface ShowTabsProps {
  orgSlug: string;
  showId: string;
}

interface TeamMember {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  member_type: "Artist" | "Crew" | "Agent" | "Manager" | null;
  user_id?: string | null;
  duty?: string;
}

interface Invitation {
  person_id: string;
}

const tabs = [
  {
    name: "Team",
    icon: Users,
    action: "team-popup" as const,
  },
];

export function ShowTabs({ orgSlug, showId }: ShowTabsProps) {
  const pathname = usePathname();
  const [showTeamPopup, setShowTeamPopup] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availablePeople, setAvailablePeople] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [seatInfo, setSeatInfo] = useState<{ can_invite: boolean } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showTeamPopup) {
      fetchTeamMembers();
    }
  }, [showTeamPopup]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const [teamResponse, invitationsResponse, seatsResponse] =
        await Promise.all([
          fetch(`/api/${orgSlug}/shows/${showId}/team`),
          fetch(`/api/${orgSlug}/invitations`),
          fetch(`/api/${orgSlug}/seats`),
        ]);

      if (teamResponse.ok) {
        const data = await teamResponse.json();
        setTeamMembers(data.assignedTeam || []);
        setAvailablePeople(data.availablePeople || []);
      }

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData || []);
      }

      if (seatsResponse.ok) {
        const seatsData = await seatsResponse.json();
        setSeatInfo(seatsData);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClick = (tab: (typeof tabs)[number]) => {
    if (tab.action === "team-popup") {
      setShowTeamPopup(true);
    }
  };

  return (
    <>
      <div className="overflow-x-auto overflow-y-hidden">
        <nav className="flex gap-4" aria-label="Show navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap rounded-full",
                  tab.action === "team-popup"
                    ? "bg-tab-bg text-tab-text hover:bg-tab-bg-active border-tab-border"
                    : "cursor-not-allowed bg-tab-bg text-tab-text hover:bg-tab-bg-active border-tab-border"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <TeamMemberPopup
        open={showTeamPopup}
        onOpenChange={setShowTeamPopup}
        teamMembers={teamMembers}
        availablePeople={availablePeople}
        invitations={invitations}
        seatInfo={seatInfo}
        showId={showId}
        orgSlug={orgSlug}
        onRefresh={fetchTeamMembers}
      />
    </>
  );
}
