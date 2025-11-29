import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Handshake } from 'lucide-react'
import { logger } from '@/lib/logger'

interface PartnersPageProps {
  params: Promise<{ org: string }>
}

export default async function PartnersPage({ params }: PartnersPageProps) {
  const { org: orgSlug } = await params
  
  const supabase = await getSupabaseServer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgData, error } = await (supabase as any)
    .rpc('get_org_by_slug', { p_slug: orgSlug })

  if (error || !orgData) {
    logger.error('Failed to fetch organization', { slug: orgSlug, error })
    return <div>Organization not found</div>
  }

  // TODO: Get partners/external collaborators from database
  // This could be venues, promoters, suppliers, etc.
  const partners: unknown[] = []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Partners</h1>
        <p className="text-muted-foreground">
          External collaborators, venues, promoters, and suppliers for your organization.
        </p>
      </div>

      {/* Partners Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5" />
              <CardTitle className="text-lg">All Partners ({partners.length})</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Handshake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No partners added yet</p>
            <p className="text-sm text-muted-foreground">
              Partners include venues, promoters, suppliers, and other external collaborators.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}