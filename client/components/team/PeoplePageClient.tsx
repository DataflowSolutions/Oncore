"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSectionContainer } from "@/components/ui/CardSectionContainer";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  Phone,
  FileText,
  Music,
  Building,
  Wrench,
} from "lucide-react";
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
}

interface PeoplePageClientProps {
  allPeople: Person[];
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

export default function PeoplePageClient({ allPeople }: PeoplePageClientProps) {
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
                  return (
                    <div
                      key={person.id}
                      className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                      onClick={() => handlePersonClick(person.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">
                              {person.name}
                            </h4>
                            {person.member_type && (
                              <Badge variant="outline" className="text-xs">
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {person.member_type}
                              </Badge>
                            )}
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

                        <div className="flex flex-col gap-1 text-right text-xs text-muted-foreground">
                          <span>Added {formatDate(person.created_at)}</span>
                          {person.user_id && (
                            <Badge variant="secondary" className="text-xs">
                              Has Account
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
