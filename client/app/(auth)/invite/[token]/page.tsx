import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getInvitation, acceptInvitation } from '@/lib/actions/invitations'
import { getSupabaseServer } from '@/lib/supabase/server'
import { Mail, Building2, Briefcase, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { SignUpForm } from '@/components/auth/SignUpForm'

interface InvitePageProps {
  params: Promise<{
    token: string
  }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  
  // Get invitation details
  const invitationResult = await getInvitation(token)
  
  if (!invitationResult.success || !invitationResult.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Invitation Invalid</CardTitle>
            </div>
            <CardDescription>
              This invitation link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you believe this is an error, please contact the person who invited you.
              </p>
              <div className="flex gap-2">
                <Button asChild className="w-full">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Home</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invitation = invitationResult.invitation as any
  
  // Check if user is already authenticated
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, let them accept the invitation
  if (user) {
    // Auto-accept invitation and redirect
    const result = await acceptInvitation(token)
    
    if (result.success && result.orgSlug) {
      redirect(`/${result.orgSlug}`)
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="w-5 h-5" />
                <CardTitle>Error Accepting Invitation</CardTitle>
              </div>
              <CardDescription>
                {result.error || 'Something went wrong while accepting the invitation.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/sign-in">Back to Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  // User is not authenticated - show signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Invitation Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">You&apos;ve Been Invited!</CardTitle>
            </div>
            <CardDescription>
              Join {invitation.org_name} to collaborate on shows and events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Organization</p>
                <p className="text-sm text-muted-foreground">{invitation.org_name}</p>
              </div>
            </div>
            
            {invitation.role_title && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Your Role</p>
                  <p className="text-sm text-muted-foreground">{invitation.role_title}</p>
                </div>
              </div>
            )}
            
            {invitation.member_type && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Team Type</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {invitation.member_type.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{invitation.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign Up Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Sign up to accept this invitation and join the team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm />
            
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href={`/sign-in?redirect=/invite/${token}`}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <p className="text-xs text-center text-muted-foreground">
          This invitation was sent to {invitation.email}. 
          <br />
          By signing up, you agree to join {invitation.org_name}.
        </p>
      </div>
    </div>
  )
}