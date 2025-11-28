import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

interface AccessCodePageProps {
  params: Promise<{ accessCode: string }>
}

export default async function AccessCodePage({ params }: AccessCodePageProps) {
  const { accessCode } = await params
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">External Access</CardTitle>
          <p className="text-muted-foreground">
            Access code: {accessCode}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              External access is being updated to a new system. 
              Please contact the show organizer for access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}