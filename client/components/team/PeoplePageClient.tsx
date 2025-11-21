"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSectionContainer } from "@/components/ui/CardSectionContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popup } from "@/components/ui/popup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Mail,
  Phone,
  FileText,
  Music,
  Building,
  Wrench,
  UserPlus,
  Send,
  Ghost,
  CheckCircle2,
  AlertCircle,
  Crown,
  Eye,
  Edit,
  Shield,
} from "lucide-react";
import PersonDetailModal from "@/components/team/PersonDetailModal";
import { invitePerson, type SeatCheckResult } from "@/lib/actions/invitations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Database } from "@/lib/database.types";

interface Person {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  member_type: string | null;
  notes: string | null;
  created_at: string;
  user_id: string | null;
  role_title?: string | null;
}

type Invitation = Database["public"]["Tables"]["invitations"]["Row"] & {
  people: {
    id: string;
    name: string;
    email: string | null;
    role_title: string | null;
    member_type: "Artist" | "Crew" | "Agent" | "Manager" | null;
  };
};

interface PeoplePageClientProps {
  allPeople: Person[];
  seatInfo: SeatCheckResult | null;
  invitations: Invitation[];
}

const getRoleIcon = (memberType: string | null) => {
  switch (memberType) {
    case "Artist":
      return Music;
    case "Agent":
    case "Manager":
      return Building;
    case "Crew":
      return Wrench;
    default:
      return Users;
  }
};

export default function PeoplePageClient({
  allPeople,
  seatInfo,
  invitations = [], // Default to empty array
}: PeoplePageClientProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [invitingPersonId, setInvitingPersonId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedInvitePerson, setSelectedInvitePerson] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    "viewer" | "editor" | "admin" | "owner"
  >("viewer");
  const router = useRouter();

  const handlePersonClick = (personId: string) => {
    setSelectedPersonId(personId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPersonId(null);
  };

  const openInviteDialog = (
    personId: string,
    personName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent card click

    if (!seatInfo?.can_invite) {
      toast.error("No available seats", {
        description: "Upgrade your plan to invite more team members",
      });
      return;
    }

    setSelectedInvitePerson({ id: personId, name: personName });
    setSelectedRole("viewer"); // Reset to default
    setInviteDialogOpen(true);
  };

  const handleInvite = async () => {
    if (!selectedInvitePerson) return;

    setInvitingPersonId(selectedInvitePerson.id);
    setInviteDialogOpen(false);

    startTransition(async () => {
      const result = await invitePerson(selectedInvitePerson.id);

      if (result.success) {
        toast.success("Invitation sent!", {
          description: `${selectedInvitePerson.name} will receive an email to join the team`,
        });
        router.refresh();
      } else {
        toast.error("Failed to send invitation", {
          description: result.error || "Please try again",
        });
      }

      setInvitingPersonId(null);
      setSelectedInvitePerson(null);
    });
  };

  // Create a map of person_id to invitation for quick lookup
  const invitationMap = new Map(invitations.map((inv) => [inv.person_id, inv]));

  const getPersonStatus = (person: Person) => {
    if (person.user_id) {
      return {
        type: "active" as const,
        label: "Active",
        icon: CheckCircle2,
        variant: "default" as const,
      };
    }
    if (invitationMap.has(person.id)) {
      return {
        type: "invited" as const,
        label: "Invited",
        icon: Send,
        variant: "secondary" as const,
      };
    }
    if (person.email) {
      return {
        type: "not_invited" as const,
        label: "Not Invited",
        icon: Ghost,
        variant: "outline" as const,
      };
    }
    return {
      type: "no_email" as const,
      label: "No Email",
      icon: AlertCircle,
      variant: "destructive" as const,
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Use a consistent format that works the same on server and client
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Group by member type for display
  const artistTeam = allPeople.filter(
    (person) => person.member_type === "Artist"
  );

  const promoterTeam = allPeople.filter(
    (person) =>
      person.member_type === "Agent" || person.member_type === "Manager"
  );

  const crewTeam = allPeople.filter((person) => person.member_type === "Crew");

  return (
    <>
      <div className="space-y-6">
        {/* Overview Stats */}
        <CardSectionContainer>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{allPeople.length}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{artistTeam.length}</p>
                  <p className="text-xs text-muted-foreground">Artists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{promoterTeam.length}</p>
                  <p className="text-xs text-muted-foreground">Business</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{crewTeam.length}</p>
                  <p className="text-xs text-muted-foreground">Crew</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardSectionContainer>

        {/* All Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle className="text-lg">
                All Team Members ({allPeople.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {allPeople.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No team members added yet. Add your first team member to get
                  started!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allPeople.map((person) => {
                  const RoleIcon = getRoleIcon(person.member_type);
                  const status = getPersonStatus(person);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={person.id}
                      className="rounded-lg border border-input bg-card text-foreground shadow-sm p-2.5 sm:p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                      onClick={() => handlePersonClick(person.id)}
                    >
                      <div className="flex flex-col gap-2">
                        {/* Header with name and badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="font-semibold text-foreground text-sm">
                              {person.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {person.member_type && (
                                <Badge
                                  variant="outline"
                                  className="text-xs h-5"
                                >
                                  <RoleIcon className="w-3 h-3 mr-1" />
                                  {person.member_type}
                                </Badge>
                              )}
                              <Badge
                                variant={status.variant}
                                className="text-xs h-5"
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Actions - desktop */}
                          <div className="hidden sm:flex gap-2 items-center">
                            {!person.user_id &&
                              person.email &&
                              !invitationMap.has(person.id) && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={
                                    !seatInfo?.can_invite ||
                                    invitingPersonId === person.id
                                  }
                                  onClick={(e) =>
                                    openInviteDialog(person.id, person.name, e)
                                  }
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                  {invitingPersonId === person.id ? (
                                    <>
                                      <FileText className="w-3 h-3 mr-2 animate-pulse" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-3 h-3 mr-2" />
                                      Invite
                                    </>
                                  )}
                                </Button>
                              )}
                            {!person.email && !person.user_id && (
                              <Badge
                                variant="destructive"
                                className="text-xs w-fit"
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                No Email
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Contact information and dates */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {person.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="break-all">
                                  {person.email}
                                </span>
                              </div>
                            )}
                            {person.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span>{person.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span>Added {formatDate(person.created_at)}</span>
                            {invitationMap.has(person.id) &&
                              invitationMap.get(person.id)!.created_at && (
                                <span>
                                  Invited{" "}
                                  {formatDate(
                                    invitationMap.get(person.id)!.created_at!
                                  )}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Actions - mobile */}
                        <div className="flex sm:hidden flex-col gap-2">
                          {!person.user_id &&
                            person.email &&
                            !invitationMap.has(person.id) && (
                              <Button
                                variant="default"
                                size="sm"
                                disabled={
                                  !seatInfo?.can_invite ||
                                  invitingPersonId === person.id
                                }
                                onClick={(e) =>
                                  openInviteDialog(person.id, person.name, e)
                                }
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                              >
                                {invitingPersonId === person.id ? (
                                  <>
                                    <FileText className="w-3 h-3 mr-2 animate-pulse" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3 h-3 mr-2" />
                                    Invite
                                  </>
                                )}
                              </Button>
                            )}
                          {!person.email && !person.user_id && (
                            <Badge
                              variant="destructive"
                              className="text-xs w-fit"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No Email
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PersonDetailModal
        personId={selectedPersonId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Invite Role Selection Dialog */}
      <Popup
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        title="Invite Team Member"
        description={`Choose the role for ${selectedInvitePerson?.name}. They will receive an email invitation to join your organization.`}
        className="sm:max-w-[425px]"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite}>
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </>
        }
      >
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <Select
              value={selectedRole}
              onValueChange={(value: "viewer" | "editor" | "admin" | "owner") =>
                setSelectedRole(value)
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Viewer</div>
                      <div className="text-xs text-muted-foreground">
                        Can view all data but cannot make changes
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Editor</div>
                      <div className="text-xs text-muted-foreground">
                        Can create and edit content
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">
                        Can manage team members and settings
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="owner">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Owner</div>
                      <div className="text-xs text-muted-foreground">
                        Full control (use with caution)
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Popup>
    </>
  );
}
