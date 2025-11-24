"use client";

import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TeamMember {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  member_type: "Artist" | "Crew" | "Agent" | "Manager" | null;
  user_id?: string | null;
  duty?: string;
}

interface TeamMemberPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  availablePeople: TeamMember[];
  invitations: Array<{ person_id: string }>;
  seatInfo: { can_invite: boolean } | null;
  showId: string;
  orgSlug: string;
  onRefresh: () => void;
}

export function TeamMemberPopup({
  open,
  onOpenChange,
  teamMembers,
  availablePeople,
  invitations,
  seatInfo,
  showId,
  orgSlug,
  onRefresh,
}: TeamMemberPopupProps) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAddView, setShowAddView] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [invitingPersonId, setInvitingPersonId] = useState<string | null>(null);

  const handleRemoveMember = async (personId: string, personName: string) => {
    setRemovingId(personId);

    try {
      const response = await fetch(`/api/${orgSlug}/shows/${showId}/team`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove team member");
      }

      toast.success("Team member removed", {
        description: `${personName} has been removed from the show`,
      });

      onRefresh();
      router.refresh();
    } catch (error) {
      toast.error("Failed to remove team member", {
        description: "Please try again",
      });
      console.error("Error removing team member:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleInvite = async (personId: string, personName: string) => {
    if (!seatInfo?.can_invite) {
      toast.error("No available seats", {
        description: "Upgrade your plan to invite more team members",
      });
      return;
    }

    setInvitingPersonId(personId);

    try {
      const response = await fetch(`/api/${orgSlug}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      toast.success("Invitation sent!", {
        description: `${personName} will receive an email to join the team`,
      });

      onRefresh();
      router.refresh();
    } catch (error) {
      toast.error("Failed to send invitation", {
        description: "Please try again",
      });
      console.error("Error sending invitation:", error);
    } finally {
      setInvitingPersonId(null);
    }
  };

  const handleAddMember = async (personId: string, personName: string) => {
    setIsAdding(true);

    try {
      const formData = new FormData();
      formData.append("showId", showId);
      formData.append("personId", personId);
      formData.append("duty", "");

      const response = await fetch(
        `/api/${orgSlug}/shows/${showId}/team/assign`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add team member");
      }

      toast.success("Team member added", {
        description: `${personName} has been added to the show`,
      });

      onRefresh();
      router.refresh();
      setShowAddView(false);
      setSelectedPeople(new Set());
    } catch (error) {
      toast.error("Failed to add team member", {
        description: "Please try again",
      });
      console.error("Error adding team member:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddSelectedMembers = async () => {
    if (selectedPeople.size === 0) return;

    setIsAdding(true);

    try {
      const promises = Array.from(selectedPeople).map(async (personId) => {
        const formData = new FormData();
        formData.append("showId", showId);
        formData.append("personId", personId);
        formData.append("duty", "");

        const response = await fetch(
          `/api/${orgSlug}/shows/${showId}/team/assign`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to add team member");
        }
      });

      await Promise.all(promises);

      toast.success("Team members added", {
        description: `${selectedPeople.size} member${
          selectedPeople.size > 1 ? "s" : ""
        } added to the show`,
      });

      onRefresh();
      router.refresh();
      setShowAddView(false);
      setSelectedPeople(new Set());
    } catch (error) {
      toast.error("Failed to add team members", {
        description: "Please try again",
      });
      console.error("Error adding team members:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const togglePersonSelection = (personId: string) => {
    const newSelection = new Set(selectedPeople);
    if (newSelection.has(personId)) {
      newSelection.delete(personId);
    } else {
      newSelection.add(personId);
    }
    setSelectedPeople(newSelection);
  };

  // Filter out people who are already assigned
  const assignedIds = new Set(teamMembers.map((m) => m.id));
  const filteredAvailablePeople = availablePeople.filter(
    (p) => !assignedIds.has(p.id)
  );

  // Create invitation map
  const invitationMap = new Map(invitations.map((inv) => [inv.person_id, inv]));

  // Reset view when popup closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowAddView(false);
      setSelectedPeople(new Set());
    }
    onOpenChange(isOpen);
  };

  return (
    <Popup
      title={showAddView ? "Add Team Members" : "Team"}
      description={
        showAddView
          ? "Select people to add to this show"
          : "Team members assigned to this show"
      }
      open={open}
      onOpenChange={handleOpenChange}
      className="max-w-2xl "
    >
      <div className="space-y-4">
        {!showAddView ? (
          <>
            {/* Current Team Members View */}
            <div className="space-y-3 max-h-[30vh] overflow-y-auto">
              {teamMembers.length === 0 ? (
                <div className="text-center py-8 text-description-foreground">
                  No team members assigned to this show yet
                </div>
              ) : (
                teamMembers.map((person) => {
                  return (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-4 rounded-lg border border-card-cell-border bg-card-cell"
                    >
                      {/* Left side: Name, phone, email */}
                      <div className="flex flex-col gap-1.5 flex-1 text-sm">
                        <h4 className="font-header text-foreground">
                          {person.name}
                        </h4>
                        {person.phone && (
                          <div className="text-sm text-description-foreground">
                            {person.phone}
                          </div>
                        )}
                        {person.email && (
                          <div className="text-sm text-description-foreground break-all">
                            {person.email}
                          </div>
                        )}
                      </div>

                      {/* Right side: Badges and Remove button */}
                      <div className="flex items-center gap-3">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvite(person.id, person.name);
                                }}
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
                        <button
                          onClick={() =>
                            handleRemoveMember(person.id, person.name)
                          }
                          disabled={removingId === person.id}
                          className="flex-shrink-0 p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          aria-label={`Remove ${person.name}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-end">
              <Button
                className="rounded-full font-header"
                size="lg"
                onClick={() => setShowAddView(true)}
              >
                {teamMembers.length === 0 ? "Add Team Member" : "Add More"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Add Members View */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddView(false);
                  setSelectedPeople(new Set());
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Team
              </Button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {filteredAvailablePeople.length === 0 ? (
                <div className="text-center py-8 text-description-foreground">
                  {availablePeople.length === 0
                    ? "No people available. Add people to your organization first."
                    : "All available people are already assigned to this show."}
                </div>
              ) : (
                filteredAvailablePeople.map((person) => {
                  const isSelected = selectedPeople.has(person.id);
                  return (
                    <div
                      key={person.id}
                      onClick={() => togglePersonSelection(person.id)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-card-cell-border bg-card-cell cursor-pointer hover:bg-card-cell/80 transition-colors"
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePersonSelection(person.id)}
                        className="flex-shrink-0 cursor-pointer"
                      />

                      {/* Person info */}
                      <div className="flex flex-col gap-1.5 flex-1">
                        <h4 className="font-header text-foreground">
                          {person.name}
                        </h4>
                        {person.phone && (
                          <div className="text-sm text-description-foreground">
                            {person.phone}
                          </div>
                        )}
                        {person.email && (
                          <div className="text-sm text-description-foreground break-all">
                            {person.email}
                          </div>
                        )}
                      </div>

                      {/* Right side: Badges */}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvite(person.id, person.name);
                              }}
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
                  );
                })
              )}
            </div>

            {/* Add Members Button */}
            {filteredAvailablePeople.length > 0 && (
              <div className="flex justify-end pt-2">
                <Button
                  className="rounded-full font-header"
                  size="lg"
                  onClick={handleAddSelectedMembers}
                  disabled={selectedPeople.size === 0 || isAdding}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Add Members ({selectedPeople.size})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Popup>
  );
}
