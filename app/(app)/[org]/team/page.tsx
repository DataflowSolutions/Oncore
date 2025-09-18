import { getSupabaseServer } from '@/lib/supabase/server'
import { TeamActions } from '@/components/team/TeamActions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TeamPageProps {
  params: { org: string }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const supabase = await getSupabaseServer()
  const resolvedParams = await params
  
  // Get org info
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', resolvedParams.org)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  // Get current team members
  const { data: members } = await supabase
    .from('org_members')
    .select(`
      user_id,
      role,
      created_at
    `)
    .eq('org_id', org.id)

  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="mt-2 text-foreground/50">Manage your team members and external collaborators</p>
        </div>
        <TeamActions orgId={org.id} />
      </div>

      {/* Current Team Members */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Team Members</CardTitle>
            {members && (
              <Badge variant="secondary">
                {members.length} {members.length === 1 ? "member" : "members"}
              </Badge>
            )}
          </div>
          <CardDescription>
            Active team members in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex justify-between items-center"
                >
                  <div className="flex flex-col gap-2">
                    <h4 className="font-semibold text-sm truncate">
                      User {member.user_id.slice(0, 8)}...
                    </h4>
                    <Badge variant="outline" className="w-fit capitalize">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <span className="text-xs text-foreground/50 font-medium">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-foreground/50">No team members found</p>
          )}
        </CardContent>
      </Card>

      {/* Info about cross-org collaboration */}
      <Card className="border-blue-200 bg-blue-50/10">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            💡 About Collaborators & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-foreground/80">• <strong>Team Members</strong> are part of your organization and count toward your member limit</p>
          <p className="text-foreground/80">• <strong>External Collaborators</strong> are promoters/venues invited to specific shows</p>
          <p className="text-foreground/80">• Collaborators use your plan&apos;s limits but don&apos;t need their own subscription</p>
          <p className="text-foreground/80">• This creates viral growth - satisfied collaborators often become customers</p>
        </CardContent>
      </Card>
    </div>
  )
}