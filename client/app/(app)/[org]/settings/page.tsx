"use client";

import { useState, useEffect } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  FileText,
  Calendar,
  Users,
  Filter,
  Settings,
  Crown,
  Edit,
  Eye,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { RolesPermissionsTab } from "@/components/settings/RolesPermissionsTab";
import { getOrgMembers, getCurrentUserRole } from "@/lib/actions/org-members";
import { getRolePermissions, type OrgRole } from "@/lib/utils/role-permissions";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  date: string;
  time: string;
  user: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | object | null;
}

interface OrgMemberWithUser {
  created_at: string;
  org_id: string;
  role: OrgRole;
  user_id: string;
  user_email: string;
  user_name: string | null;
}

const getRoleIcon = (role: OrgRole) => {
  switch (role) {
    case "owner":
      return Crown;
    case "admin":
      return Shield;
    case "editor":
      return Edit;
    case "viewer":
      return Eye;
  }
};

const getRoleBadgeColor = (role: OrgRole) => {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "editor":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "viewer":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgSlug = params.org as string;
  const supabase = createClient();

  // Get active tabs from URL
  const mainTab = searchParams.get("tab") || "personal";
  const orgTab = searchParams.get("orgTab") || "account";

  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<OrgRole | null>(null);
  const [members, setMembers] = useState<OrgMemberWithUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [changelogFilter, setChangelogFilter] = useState({
    date: "all",
    resourceType: "all",
    userId: "all",
  });
  const [changelogEntries, setChangelogEntries] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch org ID and current user
  useEffect(() => {
    async function fetchOrgAndUser() {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (orgData) {
        setOrgId(orgData.id);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    fetchOrgAndUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  // Fetch org members and current user role
  useEffect(() => {
    if (!orgId) return;

    async function fetchMembersAndRole() {
      setLoadingMembers(true);
      try {
        const [membersData, roleData] = await Promise.all([
          getOrgMembers(orgId!),
          getCurrentUserRole(orgId!),
        ]);

        setMembers(membersData);
        setCurrentUserRole(roleData);
      } catch (error) {
        logger.error("Error fetching members or role", error);
      } finally {
        setLoadingMembers(false);
      }
    }

    fetchMembersAndRole();
  }, [orgId]);

  // Fetch activity logs
  useEffect(() => {
    if (!orgId) return;

    async function fetchLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          orgId: orgId || "",
          date: changelogFilter.date,
          resourceType: changelogFilter.resourceType,
          userId: changelogFilter.userId,
        });

        const response = await fetch(`/api/activity-log?${params}`);
        const data = await response.json();

        if (data.success) {
          setChangelogEntries(data.logs);
        }
      } catch (error) {
        logger.error("Error fetching activity logs", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [orgId, changelogFilter]);

  const handleMainTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    if (value === "personal") {
      params.delete("orgTab");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOrgTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("orgTab", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-16 mt-4">
      <div className="flex items-center mb-6 gap-2">
        <Settings width={32} height={32} />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-foreground/50">
            Manage your personal preferences and organization settings
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
          <Button
            onClick={() => handleMainTabChange("personal")}
            variant={mainTab === "personal" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2 cursor-pointer transition-all",
              mainTab !== "personal" && "hover:bg-background/50"
            )}
          >
            Personal
          </Button>
          <Button
            onClick={() => handleMainTabChange("organization")}
            variant={mainTab === "organization" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-2 cursor-pointer transition-all",
              mainTab !== "organization" && "hover:bg-background/50"
            )}
          >
            Organization
          </Button>
        </div>
      </div>

      <Tabs value={mainTab} className="space-y-6">
        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-6">
          {/* Your Roles & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Your Roles & Permissions</CardTitle>
              <CardDescription>
                Your current role determines what you can access in the
                application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUserRole ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center ${getRoleBadgeColor(
                        currentUserRole
                      )}`}
                    >
                      {(() => {
                        const RoleIcon = getRoleIcon(currentUserRole);
                        return <RoleIcon className="w-8 h-8" />;
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-semibold">
                          {getRolePermissions(currentUserRole).label}
                        </h3>
                        <Badge className={getRoleBadgeColor(currentUserRole)}>
                          {currentUserRole}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {getRolePermissions(currentUserRole).description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Your Permissions</h4>
                    <ul className="space-y-2">
                      {getRolePermissions(currentUserRole).permissions.map(
                        (permission, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="text-sm">{permission}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center items-center text-muted-foreground flex flex-col gap-2">
                    <Shield width={48} height={48} />
                    <div className="mt-2">No roles assigned yet</div>
                    <div className="text-xs text-muted-foreground">
                      Contact an administrator to get roles assigned
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
              <CardDescription>
                Customize your application experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive updates about your shows and tours
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                  >
                    Configure
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="font-medium">Theme</div>
                  <div className="text-sm text-muted-foreground">
                    Switch between light, dark, and system theme
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">Dashboard Layout</div>
                  <div className="text-sm text-muted-foreground">
                    Customize your dashboard view
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                  >
                    Customize
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">Sign Out</div>
                  <div className="text-sm text-muted-foreground">
                    Sign out from your account on this device
                  </div>
                </div>
                <SignOutButton
                  variant="destructive"
                  className="cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
              <Button
                onClick={() => handleOrgTabChange("account")}
                variant={orgTab === "account" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 cursor-pointer transition-all",
                  orgTab !== "account" && "hover:bg-background/50"
                )}
              >
                Account
              </Button>
              <Button
                onClick={() => handleOrgTabChange("roles")}
                variant={orgTab === "roles" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 cursor-pointer transition-all",
                  orgTab !== "roles" && "hover:bg-background/50"
                )}
              >
                Roles & Permissions
              </Button>
              <Button
                onClick={() => handleOrgTabChange("notifications")}
                variant={orgTab === "notifications" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 cursor-pointer transition-all",
                  orgTab !== "notifications" && "hover:bg-background/50"
                )}
              >
                Notifications
              </Button>
              <Button
                onClick={() => handleOrgTabChange("changelog")}
                variant={orgTab === "changelog" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 cursor-pointer transition-all",
                  orgTab !== "changelog" && "hover:bg-background/50"
                )}
              >
                Changelog
              </Button>
            </div>
          </div>

          <Tabs value={orgTab} className="space-y-6">
            {/* Account Tab */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>
                    View and update your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input placeholder="Your name" defaultValue="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        defaultValue="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select defaultValue="manager">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="artist">Artist</SelectItem>
                          <SelectItem value="crew">Crew</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input type="tel" placeholder="+1 (555) 000-0000" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security
                  </CardTitle>
                  <CardDescription>
                    Manage your password and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline">Change Password</Button>
                  <Button variant="outline">
                    Enable Two-Factor Authentication
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>Manage your account session</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">Sign Out</div>
                      <div className="text-sm text-muted-foreground">
                        Sign out from your account on this device
                      </div>
                    </div>
                    <SignOutButton variant="destructive" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roles & Permissions Tab */}
            <TabsContent value="roles" className="space-y-4">
              {loadingMembers ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      Loading team members...
                    </div>
                  </CardContent>
                </Card>
              ) : orgId && currentUserId && currentUserRole ? (
                <RolesPermissionsTab
                  members={members}
                  currentUserRole={currentUserRole}
                  currentUserId={currentUserId}
                  orgId={orgId}
                />
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      Unable to load roles and permissions
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Control how you receive updates about your shows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Show Updates</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified about show changes
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      Configure
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Team Activity</h4>
                      <p className="text-sm text-muted-foreground">
                        Updates about team member actions
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Changelog Tab */}
            <TabsContent value="changelog" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Activity Log
                  </CardTitle>
                  <CardDescription>
                    View all changes and updates to your shows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filter by:</span>
                    </div>
                    <Select
                      value={changelogFilter.date}
                      onValueChange={(value) =>
                        setChangelogFilter({ ...changelogFilter, date: value })
                      }
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dates</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={changelogFilter.resourceType}
                      onValueChange={(value) =>
                        setChangelogFilter({
                          ...changelogFilter,
                          resourceType: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Resource Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="show">Shows</SelectItem>
                        <SelectItem value="venue">Venues</SelectItem>
                        <SelectItem value="person">People</SelectItem>
                        <SelectItem value="assignment">Assignments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Changelog Entries */}
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        Loading activity logs...
                      </p>
                    </div>
                  ) : changelogEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No activity logs found
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {changelogEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  <Calendar className="w-3 h-3" />
                                  {entry.date}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {entry.time}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  <Users className="w-3 h-3" />
                                  {entry.user}
                                </Badge>
                              </div>
                              <h4 className="font-medium">{entry.action}</h4>
                              {entry.details && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {typeof entry.details === "object"
                                    ? JSON.stringify(entry.details)
                                    : entry.details}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Resource: {entry.resourceType}{" "}
                                {entry.resourceId
                                  ? `(${entry.resourceId.slice(0, 8)}...)`
                                  : ""}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {entry.resourceType}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
