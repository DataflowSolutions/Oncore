"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { useTheme } from "next-themes";

interface UserProfile {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
  };
}

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

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params.org as string;
  const supabase = createClient();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser as UserProfile);
        setFullName(authUser.user_metadata?.full_name || "");
        setPhone(authUser.user_metadata?.phone || "");

        // Fetch user's organizations
        const { data: orgsData } = await supabase
          .from("org_members")
          .select(
            `
            role,
            created_at,
            organizations (
              id,
              name,
              slug,
              created_at
            )
          `
          )
          .eq("user_id", authUser.id);

        if (orgsData) {
          setOrganizations(orgsData as UserOrganization[]);
        }
      }
    }
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current org ID
  useEffect(() => {
    async function fetchCurrentOrg() {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (orgData) {
        setCurrentOrgId(orgData.id);
      }
    }
    fetchCurrentOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone,
        },
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      logger.error("Error updating profile", error);
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    setPasswordChanging(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Password changed successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      logger.error("Error changing password", error);
      setMessage({ type: "error", text: "Failed to change password" });
    } finally {
      setPasswordChanging(false);
    }
  };

  // const handleDeleteOrg = async (orgId: string) => {
  //   if (!confirm("Are you sure you want to delete this organization?")) {
  //     return;
  //   }

  //   try {
  //     const { error } = await supabase
  //       .from("organizations")
  //       .delete()
  //       .eq("id", orgId);

  //     if (error) throw error;

  //     setOrganizations(
  //       organizations.filter((org) => org.organizations.id !== orgId)
  //     );
  //     setMessage({
  //       type: "success",
  //       text: "Organization deleted successfully",
  //     });

  //     // If we deleted the current org, redirect to home
  //     if (orgId === currentOrgId) {
  //       router.push("/");
  //     }
  //   } catch (error) {
  //     logger.error("Error deleting organization", error);
  //     setMessage({ type: "error", text: "Failed to delete organization" });
  //   }
  // };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "editor":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <div className=" mt-4">
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 w-full">
        {/* Account Settings */}
        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="font-header text-xl">
              Account Settings
            </CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed yet!
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                className="rounded-full font-header"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="font-header text-xl">Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleChangePassword}
                className="rounded-full font-header"
                disabled={passwordChanging}
              >
                {passwordChanging ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Support */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="font-header text-xl">Support</CardTitle>
              <CardDescription>Send us a message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="How can we help you?"
                className="min-h-[120px]"
              />
              <div className="flex justify-end">
                <Button className="rounded-full font-header">
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organizations */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between ">
                <span className="font-header text-xl">Organizations</span>
                <Button asChild size="sm" className="rounded-full font-header">
                  <Link href="/create-org">Add New</Link>
                </Button>
              </CardTitle>
              <CardDescription>
                Switch between organizations or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No organizations yet
                  </p>
                  <Button asChild className="rounded-full font-header">
                    <Link href="/create-org">
                      Create Your First Organization
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {organizations.map(({ organizations: org, role }) => (
                    <div
                      key={org.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        org.id === currentOrgId
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{org.name}</h3>
                          <Badge className={getRoleBadgeColor(role)}>
                            {role}
                          </Badge>
                          {org.id === currentOrgId && (
                            <Badge variant="outline">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          /{org.slug}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {org.id !== currentOrgId && (
                          <Button asChild size="sm">
                            <Link href={`/${org.slug}`}>Switch</Link>
                          </Button>
                        )}
                        {role === "owner" && (
                          <Button
                            variant="outline"
                            size="sm"
                            // onClick={() => handleDeleteOrg(org.id)}
                            className="bg-red-600! cursor-not-allowed opacity-50"
                            title="Coming soon!"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="font-header text-xl">Settings</CardTitle>
              <CardDescription>Manage your preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <div className="text-sm text-muted-foreground">
                    Toggle between light and dark theme
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mounted && (
                    <>
                      {/* <Sun className="h-4 w-4" /> */}
                      <Switch
                        checked={isDark}
                        onCheckedChange={(checked) =>
                          setTheme(checked ? "dark" : "light")
                        }
                      />
                      {/* <Moon className="h-4 w-4" /> */}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive updates via email
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
