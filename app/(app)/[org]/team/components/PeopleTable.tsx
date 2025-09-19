import React from "react";
import { getPeopleByOrg } from "@/lib/actions/team";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Briefcase, FileText } from "lucide-react";

interface PeopleTableProps {
  orgId: string
}

const PeopleTable = async ({ orgId }: PeopleTableProps) => {
  const people = await getPeopleByOrg(orgId)

  if (people.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Crew Members
          </CardTitle>
          <CardDescription>
            Manage your crew members and team contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No crew members yet. Add your first crew member to get started!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Crew Members
          </CardTitle>
          <Badge variant="secondary">
            {people.length} {people.length === 1 ? "person" : "people"}
          </Badge>
        </div>
        <CardDescription>
          Manage your crew members and team contacts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {people.map((person) => (
            <div
              key={person.id}
              className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{person.name}</h4>
                    {person.role_title && (
                      <Badge variant="outline" className="text-xs">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {person.role_title}
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
                      <span className="line-clamp-2">{person.notes}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-1 text-right text-xs text-muted-foreground">
                  <span>Added {new Date(person.created_at).toLocaleDateString()}</span>
                  {person.user_id && (
                    <Badge variant="secondary" className="text-xs">
                      Has Account
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default PeopleTable