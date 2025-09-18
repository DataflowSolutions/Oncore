import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export default function ProfileSettingsPage() {
  return (
    <div className="mb-16 mt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-2 text-foreground/50">Manage your account settings and preferences</p>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how the application looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base">Theme</div>
                  <div className="text-sm text-muted-foreground">
                    Choose between light and dark mode
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <div className="text-xs text-muted-foreground border-t pt-4">
                The theme preference is saved locally and will persist across sessions.
                Current background: <span className="font-mono bg-muted px-1 rounded">bg-background</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Account settings coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}