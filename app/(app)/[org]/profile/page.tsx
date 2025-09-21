import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Settings } from "lucide-react";

export default function ProfileSettingsPage() {
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
              Your current roles determine what you can access in the
              application
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center items-center text-muted-foreground flex flex-col gap-2">
              <Shield width={48} height={48} />

              <div className="mt-2">No roles assigned yet</div>
              <div className="text-xs text-muted-foreground">
                Contact an administrator to get roles assigned
              </div>
            </div>
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
