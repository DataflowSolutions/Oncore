import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DayPage() {
  return (
    <div className="mb-16 mt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Day Schedule</h1>
        <p className="mt-2 text-foreground/50">Today&apos;s schedule and activities - coming soon!</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Agenda</CardTitle>
          <CardDescription>Your scheduled events and activities for today</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/50">No events scheduled for today.</p>
        </CardContent>
      </Card>
    </div>
  )
}