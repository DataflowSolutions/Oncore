import { verifyAccessCode } from '@/lib/actions/advancing'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'

interface AccessCodePageProps {
  params: Promise<{ accessCode: string }>
  searchParams: Promise<{ error?: string }>
}

async function validateAccessCode(accessCode: string) {
  'use server'
  
  const result = await verifyAccessCode(accessCode)
  
  if (result.success && result.sessionId) {
    // Store the access code in a cookie or session for authentication
    // For now, redirect directly to the session
    redirect(`/s/${accessCode}/session`)
  } else {
    redirect(`/s/${accessCode}?error=invalid`)
  }
}

export default async function AccessCodePage({ params, searchParams }: AccessCodePageProps) {
  const { accessCode } = await params
  const { error } = await searchParams
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Access Advancing Session</CardTitle>
          <p className="text-muted-foreground">
            You&apos;ve been invited to collaborate on an advancing session.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Invalid access code. Please check the link and try again.
              </p>
            </div>
          )}
          
          <form action={validateAccessCode.bind(null, accessCode)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="verification" className="block text-sm font-medium mb-2">
                  Access Code
                </label>
                <Input
                  id="verification"
                  type="text"
                  value={accessCode}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This code was provided in your invitation link.
                </p>
              </div>
              
              <Button type="submit" className="w-full">
                Access Session
              </Button>
            </div>
          </form>
          
          <div className="text-center text-xs text-muted-foreground">
            <p>
              By accessing this session, you agree to collaborate professionally
              and maintain confidentiality of shared information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}