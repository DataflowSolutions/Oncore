"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Bell, 
  Shield, 
  FileText, 
  Phone, 
  Mail, 
  MessageSquare,
  Calendar,
  Users,
  Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logger } from '@/lib/logger'
import { RolesPermissionsTab } from "@/components/settings/RolesPermissionsTab";
import { getOrgMembers, getCurrentUserRole } from "@/lib/actions/org-members";
import type { OrgRole } from "@/lib/utils/role-permissions";


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
  created_at: string
  org_id: string
  role: OrgRole
  user_id: string
  user_email: string
  user_name: string | null
}

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params.org as string;
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<OrgRole | null>(null);
  const [members, setMembers] = useState<OrgMemberWithUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [changelogFilter, setChangelogFilter] = useState({
    date: "all",
    resourceType: "all",
    userId: "all"
  });
  const [changelogEntries, setChangelogEntries] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch org ID and current user
  useEffect(() => {
    async function fetchOrgAndUser() {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single();
      
      if (orgData) {
        setOrgId(orgData.id);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    fetchOrgAndUser();
  }, [orgSlug]);

  // Fetch org members and current user role
  useEffect(() => {
    if (!orgId) return;

    async function fetchMembersAndRole() {
      setLoadingMembers(true);
      try {
        const [membersData, roleData] = await Promise.all([
          getOrgMembers(orgId!),
          getCurrentUserRole(orgId!)
        ]);
        
        setMembers(membersData);
        setCurrentUserRole(roleData);
      } catch (error) {
        logger.error('Error fetching members or role', error);
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
          orgId: orgId || '',
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
        logger.error('Error fetching activity logs', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [orgId, changelogFilter]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, notifications, and view activity
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

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
                  <Input type="email" placeholder="your.email@example.com" defaultValue="john@example.com" />
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
              <Button variant="outline">Enable Two-Factor Authentication</Button>
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
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Show Updates</h4>
                  <p className="text-sm text-muted-foreground">Get notified about show changes</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Team Activity</h4>
                  <p className="text-sm text-muted-foreground">Updates about team member actions</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
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
                <Select value={changelogFilter.date} onValueChange={(value) => setChangelogFilter({ ...changelogFilter, date: value })}>
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
                <Select value={changelogFilter.resourceType} onValueChange={(value) => setChangelogFilter({ ...changelogFilter, resourceType: value })}>
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
                  <p className="text-muted-foreground">Loading activity logs...</p>
                </div>
              ) : changelogEntries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {changelogEntries.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {entry.date}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{entry.time}</span>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {entry.user}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{entry.action}</h4>
                          {entry.details && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof entry.details === 'object' 
                                ? JSON.stringify(entry.details) 
                                : entry.details}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Resource: {entry.resourceType} {entry.resourceId ? `(${entry.resourceId.slice(0, 8)}...)` : ''}
                          </p>
                        </div>
                        <Badge variant="outline">{entry.resourceType}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Get help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <Mail className="w-8 h-8 text-primary" />
                  <h4 className="font-medium">Email Support</h4>
                  <p className="text-sm text-muted-foreground">
                    support@oncore.io
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="mailto:support@oncore.io">Send Email</a>
                  </Button>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <Phone className="w-8 h-8 text-primary" />
                  <h4 className="font-medium">Phone Support</h4>
                  <p className="text-sm text-muted-foreground">
                    +46 (0) 70 123 4567
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Available Mon-Fri 9AM-5PM CET
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Quick Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button variant="ghost" className="justify-start">Documentation</Button>
                  <Button variant="ghost" className="justify-start">Video Tutorials</Button>
                  <Button variant="ghost" className="justify-start">FAQ</Button>
                  <Button variant="ghost" className="justify-start">Community Forum</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}