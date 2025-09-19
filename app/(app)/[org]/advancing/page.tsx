import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { getAdvancingSessions } from '@/lib/actions/advancing'

interface AdvancingPageProps {
  params: Promise<{ org: string }>
}

export default async function AdvancingPage({ params }: AdvancingPageProps) {
  const { org: orgSlug } = await params
  
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  const sessions = await getAdvancingSessions(orgSlug)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Advancing</h1>
          <Button asChild>
            <Link href={`/${orgSlug}/advancing/new`}>
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground">
          Collaborate with promoters and venues on show logistics and advancing.
        </p>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No advancing sessions yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first advancing session to start collaborating with promoters and venues.
            </p>
            <Button asChild>
              <Link href={`/${orgSlug}/advancing/new`}>
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg line-clamp-1">
                    {session.title}
                  </CardTitle>
                  <Badge variant={session.expires_at ? 'default' : 'secondary'}>
                    {session.expires_at ? 'Active' : 'No Expiry'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Session Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created</span>
                    <span>{new Date(session.created_at).toLocaleDateString('en-US')}</span>
                  </div>
                  
                  {session.expires_at && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Expires</span>
                      <span>{new Date(session.expires_at).toLocaleDateString('en-US')}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/${orgSlug}/advancing/${session.id}`}>
                      Open Session
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
