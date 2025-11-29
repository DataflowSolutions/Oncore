"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSectionContainer } from "@/components/ui/CardSectionContainer";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Phone, Music, Building, Wrench, CheckCircle2, AlertCircle } from "lucide-react";
import PersonDetailModal from "@/components/team/PersonDetailModal";

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

interface PeoplePageClientProps {
  allPeople: Person[];
}

const getRoleIcon = (memberType: string | null) => {
  switch (memberType) {
    case "artist":
      return Music;
    case "management":
      return Building;
    case "crew":
      return Wrench;
    case "vendor":
      return Wrench;
    default:
      return Users;
  }
};

const getPersonStatus = (person: Person) => {
  if (person.user_id) {
    return {
      type: "active" as const,
      label: "Active",
      icon: CheckCircle2,
      variant: "default" as const,
    };
  }

  if (person.email) {
    return {
      type: "contact_only" as const,
      label: "Contact Only",
      icon: Mail,
      variant: "secondary" as const,
    };
  }

  return {
    type: "no_email" as const,
    label: "No Email",
    icon: AlertCircle,
    variant: "destructive" as const,
  };
};

export default function PeoplePageClient({
  allPeople
}: PeoplePageClientProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePersonClick = (personId: string) => {
    setSelectedPersonId(personId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPersonId(null);
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
    (person) => person.member_type === "artist"
  );

  const promoterTeam = allPeople.filter(
    (person) => person.member_type === "management"
  );

  const crewTeam = allPeople.filter((person) => person.member_type === "crew");

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
                          </div>
                        </div>

                        {/* Actions - mobile */}
                        <div className="flex sm:hidden flex-col gap-2">
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
    </>
  );
}
