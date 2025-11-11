import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Settings, Crown, Edit, Eye, CheckCircle } from "lucide-react";
import { getCurrentUserRole } from "@/lib/actions/org-members";
import { getRolePermissions, type OrgRole } from "@/lib/utils/role-permissions";
import { getSupabaseServer } from "@/lib/supabase/server";

const getRoleIcon = (role: OrgRole) => {
  switch (role) {
    case 'owner':
      return Crown
    case 'admin':
      return Shield
    case 'editor':
      return Edit
    case 'viewer':
      return Eye
  }
}

const getRoleBadgeColor = (role: OrgRole) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    case 'editor':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'viewer':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

export default async function ProfileSettingsPage({ params }: { params: Promise<{ org: string }> }) {
  const supabase = await getSupabaseServer();
  const resolvedParams = await params;
  
  // Get org ID from slug
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', resolvedParams.org)
    .single();

  let userRole: OrgRole | null = null;
  
  if (org) {
    userRole = await getCurrentUserRole(org.id);
  }

  const roleInfo = userRole ? getRolePermissions(userRole) : null;
  const RoleIcon = userRole ? getRoleIcon(userRole) : Shield;

  return (
    <div className="mb-16 mt-4">
      <div className="flex items-center mb-6 gap-2">
        <Settings width={32} height={32} />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-foreground/50">
            Manage your account and application preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Roles & Permissions</CardTitle>
            <CardDescription>
              Your current role determines what you can access in the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRole && roleInfo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getRoleBadgeColor(userRole)}`}>
                    <RoleIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-semibold">{roleInfo.label}</h3>
                      <Badge className={getRoleBadgeColor(userRole)}>
                        {userRole}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{roleInfo.description}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Your Permissions</h4>
                  <ul className="space-y-2">
                    {roleInfo.permissions.map((permission, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-sm">{permission}</span>
                      </li>
                    ))}
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
                <Button size="sm" className="cursor-pointer">
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
                <Button size="sm" className="cursor-pointer">
                  Customize
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
