import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, ArrowLeft, Calendar, MapPin, Users } from 'lucide-react'
import Link from 'next/link'

interface ShowAdvancingPageProps {
  params: Promise<{ org: string, showId: string }>
}

export default async function ShowAdvancingPage({ params }: ShowAdvancingPageProps) {
  const { org: orgSlug, showId } = await params
  
  const supabase = await getSupabaseServer()
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return <div>Organization not found</div>
  }

  const { data: show } = await supabase
    .from('shows')
    .select(`
      id, 
      title, 
      date,
      venues (
        name,
        city
      ),
      artists (
        name
      )
    `)
    .eq('id', showId)
    .eq('org_id', org.id)
    .single()

  if (!show) {
    return <div>Show not found</div>
  }

  // Get existing advancing sessions for this show
  const { data: sessions } = await supabase
    .from('advancing_sessions')
    .select('*')
    .eq('show_id', showId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${orgSlug}/shows/${showId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Show
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Advancing</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(show.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Venue
            </div>
            
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Artist
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/${orgSlug}/advancing/new?showId=${showId}`}>
            <Plus className="w-4 h-4 mr-2" />
            New Advancing Session
          </Link>
        </Button>
        
        <Button asChild variant="outline">
          <Link href={`/${orgSlug}/advancing`}>
            <FileText className="w-4 h-4 mr-2" />
            All Sessions
          </Link>
        </Button>
      </div>

      {/* Existing Sessions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Advancing Sessions for {show.title || 'Untitled Show'}
        </h2>
        
        {!sessions || sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No advancing sessions yet for this show
              </p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create an advancing session to collaborate with the venue on technical details,
                hospitality, and show requirements.
              </p>
              <Button asChild>
                <Link href={`/${orgSlug}/advancing/new?showId=${showId}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Session
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {session.expires_at ? 'Expires' : 'Active'}
                      </Badge>
                      <Button asChild size="sm">
                        <Link href={`/${orgSlug}/advancing/${session.id}`}>
                          View Session
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}