"use client";

import { Fragment, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCircle,
  LogOut,
  Home,
  Building2,
  Check,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { logger } from "@/lib/logger";

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

export function UserDropdownMenu() {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const params = useParams();
  const currentOrgSlug = params?.org as string | undefined;
  const supabase = createClient();

  // Fetch user's organizations
  const { data: organizations = [], isLoading } = useQuery<UserOrganization[]>({
    queryKey: queryKeys.userOrganizations("current"),
    queryFn: async () => {
      const response = await fetch(`/api/user/organizations`);
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      logger.error("Error signing out", error);
    } finally {
      setSigningOut(false);
    }
  };

  const handleOrgSwitch = (orgSlug: string) => {
    router.push(`/${orgSlug}`);
  };

  const handleBackHome = () => {
    router.push("/");
  };

  const currentOrg = organizations.find(
    (org) =>
      (org.organizations?.slug || org.slug) === currentOrgSlug
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="User Menu"
          className=" cursor-pointer"
        >
          <UserCircle className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          {currentOrg ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold">
                {currentOrg.organizations?.name || currentOrg.slug || "Organization"}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {currentOrg.role}
              </span>
            </div>
          ) : (
            "My Account"
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleBackHome} className="cursor-pointer">
            <Home className="mr-2 h-4 w-4" />
            <span>Back to Home</span>
          </DropdownMenuItem>

          {organizations.length > 1 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Building2 className="mr-2 h-4 w-4" />
                <span>Switch Organization</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {isLoading ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </DropdownMenuItem>
                ) : (
                  organizations.map((org, index) => (
                    <Fragment key={org.organizations?.id || org.id}>
                      <DropdownMenuItem
                        onClick={() => handleOrgSwitch(org.organizations?.slug || org.slug)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="truncate">
                            {org.organizations?.name || org.slug || "Organization"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0"
                            >
                              {org.role}
                            </Badge>
                          </span>
                        </div>
                        {(org.organizations?.slug || org.slug) === currentOrgSlug && (
                          <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                      {index < organizations.length - 1 && (
                        <DropdownMenuSeparator />
                      )}
                    </Fragment>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="cursor-pointer"
        >
          {signingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
