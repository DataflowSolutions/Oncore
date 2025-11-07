"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface UserOrganization {
  role: string;
  created_at: string;
  organizations: Organization;
}

interface OrganizationsListProps {
  organizations: UserOrganization[];
}

export function OrganizationsList({ organizations }: OrganizationsListProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'editor':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Organizations</h2>
        <Button asChild>
          <Link href="/create-org">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Link>
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Organizations Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first organization to start managing shows, venues, and team members.
            </p>
            <Button asChild>
              <Link href="/create-org">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map(({ organizations: org, role }) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <Link 
                      href={`/${org.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {org.name}
                    </Link>
                  </CardTitle>
                  <Badge className={getRoleBadgeColor(role)}>
                    {role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Slug: <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {org.slug}
                    </code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(org.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                
                <Button asChild className="w-full mt-4" variant="outline">
                  <Link href={`/${org.slug}`}>
                    Open Dashboard
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
