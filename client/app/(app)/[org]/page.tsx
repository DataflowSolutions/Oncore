import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OrgHomePage() {
  return (
    <div className="mb-16 mt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Organization Dashboard</h1>
        <p className="mt-2 text-foreground/50">Welcome to your organization! This is the main dashboard.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
            <CardDescription>View today&apos;s events and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/50">Check your daily agenda and important events</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-lg">Team</CardTitle>
            <CardDescription>Manage your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/50">Add, remove, and manage team member roles</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="text-lg">Shows</CardTitle>
            <CardDescription>Upcoming shows and venues</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/50">Browse and manage your scheduled performances</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}