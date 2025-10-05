"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSectionContainer } from "@/components/ui/CardSectionContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

type Invitation = Database['public']['Tables']['invitations']['Row'] & {
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
  invitations = [] // Default to empty array
}: PeoplePageClientProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [invitingPersonId, setInvitingPersonId] = useState<string | null>(null);
  const router = useRouter();

  const handlePersonClick = (personId: string) => {
    setSelectedPersonId(personId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPersonId(null);
  };

  const handleInvite = async (personId: string, personName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!seatInfo?.can_invite) {
      toast.error("No available seats", {
        description: "Upgrade your plan to invite more team members"
      });
      return;
    }

    setInvitingPersonId(personId);
    
    startTransition(async () => {
      const result = await invitePerson(personId);
      
      if (result.success) {
        toast.success("Invitation sent!", {
          description: `${personName} will receive an email to join the team`
        });
        router.refresh();
      } else {
        toast.error("Failed to send invitation", {
          description: result.error || "Please try again"
        });
      }
      
      setInvitingPersonId(null);
    });
  };

  // Create a map of person_id to invitation for quick lookup
  const invitationMap = new Map(invitations.map(inv => [inv.person_id, inv]));

  const getPersonStatus = (person: Person) => {
    if (person.user_id) {
      return { type: 'active' as const, label: 'Active', icon: CheckCircle2, variant: 'default' as const };
    }
    if (invitationMap.has(person.id)) {
      return { type: 'invited' as const, label: 'Invited', icon: Send, variant: 'secondary' as const };
    }
    if (person.email) {
      return { type: 'not_invited' as const, label: 'Not Invited', icon: Ghost, variant: 'outline' as const };
    }
    return { type: 'no_email' as const, label: 'No Email', icon: AlertCircle, variant: 'destructive' as const };
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

  const seatPercentage = seatInfo ? (seatInfo.used_seats / seatInfo.max_seats) * 100 : 0;
  const getProgressColorClass = () => {
    if (seatPercentage >= 100) return '[&>div]:bg-destructive';
    if (seatPercentage >= 80) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-primary';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Seat Usage Banner */}
        {seatInfo && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Team Seats</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {seatInfo.used_seats} / {seatInfo.max_seats} seats used
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {seatInfo.plan_id.replace('_', ' ')} plan
                    </p>
                  </div>
                </div>
                <Progress value={seatPercentage} className={`h-2 ${getProgressColorClass()}`} />
                {!seatInfo.can_invite && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>No available seats</span>
                    </div>
                    <Button variant="outline" size="sm" className="border-primary/30">
                      <Crown className="w-3 h-3" />
                      Upgrade Plan
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                      className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                      onClick={() => handlePersonClick(person.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-foreground">
                              {person.name}
                            </h4>
                            {person.member_type && (
                              <Badge variant="outline" className="text-xs">
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {person.member_type}
                              </Badge>
                            )}
                            <Badge variant={status.variant} className="text-xs">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {person.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{person.email}</span>
                              </div>
                            )}
                            {person.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{person.phone}</span>
                              </div>
                            )}
                          </div>

                          {person.notes && (
                            <div className="flex items-start gap-1 text-sm text-muted-foreground">
                              <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">
                                {person.notes}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                          <div className="text-xs text-muted-foreground">
                            Added {formatDate(person.created_at)}
                          </div>
                          
                          {/* Invite Button for users without account */}
                          {!person.user_id && person.email && !invitationMap.has(person.id) && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={!seatInfo?.can_invite || invitingPersonId === person.id}
                              onClick={(e) => handleInvite(person.id, person.name, e)}
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

                          {/* Show invitation sent date */}
                          {invitationMap.has(person.id) && invitationMap.get(person.id)!.created_at && (
                            <div className="text-xs text-muted-foreground">
                              Invited {formatDate(invitationMap.get(person.id)!.created_at!)}
                            </div>
                          )}

                          {/* Show warning if no email */}
                          {!person.email && !person.user_id && (
                            <Badge variant="destructive" className="text-xs">
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
    </>
  );
}
