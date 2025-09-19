import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'

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
    .select('id, title, date')
    .eq('id', showId)
    .eq('org_id', org.id)
    .single()

  if (!show) {
    return <div>Show not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Advancing</h1>
        <p className="text-muted-foreground">
          Manage advancing details for: {show.title || 'Untitled Show'}
        </p>
      </div>

      {/* Advancing Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <CardTitle className="text-lg">Show Advancing</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Advancing details will be available here</p>
            <p className="text-sm text-muted-foreground">
              This will include technical riders, hospitality details, and show requirements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}