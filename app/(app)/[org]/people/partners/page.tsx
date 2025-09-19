import { getSupabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Handshake, Mail, Phone, FileText, Building2, Users } from 'lucide-react'

interface PartnersPageProps {
  params: Promise<{ org: string }>
}

export default async function PartnersPage({ params }: PartnersPageProps) {
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

  // For now, we'll get external partners from the people table
  // We'll use notes or a future partner-specific table to distinguish them
  const { data: partners } = await supabase
    .from('people')
    .select('*')
    .eq('org_id', org.id)
    .or('notes.ilike.%partner%,notes.ilike.%vendor%,notes.ilike.%external%')
    .order('name')

  const allPartners = partners || []

  // For now, we'll categorize based on notes content until we have proper partner types
  const externalPartners = allPartners.filter(partner => 
    partner.notes?.toLowerCase().includes('external') || 
    partner.notes?.toLowerCase().includes('partner')
  )

  const vendors = allPartners.filter(partner => 
    partner.notes?.toLowerCase().includes('vendor')
  )

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{allPartners.length}</p>
                <p className="text-xs text-muted-foreground">Total Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{externalPartners.length}</p>
                <p className="text-xs text-muted-foreground">External Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{vendors.length}</p>
                <p className="text-xs text-muted-foreground">Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Partners */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            <CardTitle className="text-lg">All Partners ({allPartners.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allPartners.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No partners added yet. Add external collaborators and vendors to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPartners.map((partner) => {
                const isVendor = partner.notes?.toLowerCase().includes('vendor')
                return (
                  <div
                    key={partner.id}
                    className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{partner.name}</h4>
                          <Badge variant={isVendor ? "secondary" : "default"} className="text-xs">
                            {isVendor ? <Users className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
                            {partner.member_type}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {partner.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{partner.email}</span>
                            </div>
                          )}
                          {partner.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{partner.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        {partner.notes && (
                          <div className="flex items-start gap-1 text-sm text-muted-foreground">
                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{partner.notes}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 text-right text-xs text-muted-foreground">
                        <span>Added {new Date(partner.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}