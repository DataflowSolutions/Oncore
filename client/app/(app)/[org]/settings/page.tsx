"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { CircleQuestionMark, Settings } from "lucide-react";
import { useSidebarStore } from "@/lib/stores/sidebar-store";

interface UserProfile {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
  };
}

interface UserOrganization {
  org_id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.org as string;
  const supabase = createClient();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
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

        // Fetch user's organizations using RPC
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: orgsData } = await (supabase as any).rpc("get_user_organizations");

        if (orgsData) {
          setOrganizations(orgsData as UserOrganization[]);
        }
      }
    }
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get current org ID using RPC
  useEffect(() => {
    async function fetchCurrentOrg() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orgData } = await (supabase as any).rpc("get_org_by_slug", {
        p_slug: orgSlug,
      });

      if (orgData) {
        setCurrentOrgId(orgData.id);
      }
    }
    fetchCurrentOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  const handleSaveProfile = async () => {
    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone,
        },
      });

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error) {
      logger.error("Error updating profile", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordChanging(true);

    try {
      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (verifyError) {
        toast.error("Current password is incorrect");
        setPasswordChanging(false);
        return;
      }

      // If verification succeeds, update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      logger.error("Error changing password", error);
      toast.error("Failed to change password");
    } finally {
      setPasswordChanging(false);
    }
  };

  // Check if current user is owner of current org
  const isCurrentOrgOwner =
    organizations.find((o) => o.org_id === currentOrgId)?.role ===
    "owner";

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
      <div className="grid md:grid-cols-2 grid-cols-1 gap-6 w-full">
        {/* Account Settings */}
        <Card className="bg-card border-card-border space-y-4">
          <CardHeader className="m-0">
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

            <div className="flex pt-2">
              <Button
                className="rounded-full font-header"
                onClick={handleSaveProfile}
                disabled={saving}
                size="lg"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="font-header text-xl">Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
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

            <div className="flex pt-2">
              <Button
                onClick={handleChangePassword}
                className="rounded-full font-header"
                disabled={passwordChanging}
                size="lg"
              >
                {passwordChanging ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Support */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <div className="flex gap-3 items-center">
                <CardTitle className="font-header text-xl">Support</CardTitle>
                <CircleQuestionMark size={20} />
              </div>
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
                <Button
                  onClick={() => {
                    toast.error("Support message sending will be coming soon!");
                  }}
                  className="rounded-full font-header"
                  size="lg"
                >
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organizations */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle>
                <span className="font-header text-xl">Organizations</span>
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
                  {organizations.map((org) => (
                    <div
                      key={org.org_id}
                      onClick={() => {
                        if (org.org_id !== currentOrgId) {
                          // Clear selected show when switching orgs
                          // to prevent showing Day Schedule for a show from a different org
                          localStorage.removeItem("oncore_last_show");
                          useSidebarStore.getState().setLastShowId(null);
                          router.push(`/${org.slug}/settings`);
                          toast.success(
                            `Switched to organization: ${org.name}`
                          );
                        } else {
                          toast.info(
                            "You already have this organization selected."
                          );
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors border-card-cell-border cursor-pointer ${
                        org.org_id === currentOrgId
                          ? "bg-current-org-bg hover:bg-current-org-bg-hover"
                          : "bg-card-cell hover:bg-card-cell-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-header justify-between w-full">
                        <h3>{org.name}</h3>
                        {org.org_id === currentOrgId && (
                          <span className="text-xs">Selected</span>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-4">
                    {isCurrentOrgOwner && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() =>
                          toast.error(
                            "Deleting organization will be coming soon!"
                          )
                        }
                        className="bg-red-600! hover:bg-red-700! text-white rounded-full font-header"
                      >
                        Delete
                      </Button>
                    )}
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full font-header"
                    >
                      <Link href="/create-org">Add New</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-card border-card-border">
            <CardHeader>
              <div className="flex gap-3 items-center">
                <CardTitle className="font-header text-xl">Settings</CardTitle>
                <Settings size={20} />
              </div>
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
                  onClick={() => {
                    toast.warning("This does nothing at the moment.");
                  }}
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
