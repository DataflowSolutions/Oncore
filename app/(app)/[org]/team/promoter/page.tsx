import { getSupabaseServer } from '@/lib/supabase/server'
import { getPeopleByOrg } from '@/lib/actions/team'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building, Mail, Phone, FileText } from 'lucide-react'

interface PromoterTeamPageProps {
  params: Promise<{ org: string }>
}

export default async function PromoterTeamPage({ params }: PromoterTeamPageProps) {
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

  // Get people filtered by promoter/business-related roles
  const allPeople = await getPeopleByOrg(org.id)
  const promoterTeam = allPeople.filter(person => 
    person.member_type === 'Agent' || person.member_type === 'Manager'
  )

  return (
    <div className="space-y-6">
      {/* Promoter Team Section */}
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              <CardTitle className="text-lg">Promoter Team ({promoterTeam.length})</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {promoterTeam.length === 0 ? (
            <div className="text-center py-12">
              <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No promoter team members added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoterTeam.map((person) => (
                <div
                  key={person.id}
                  className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{person.name}</h4>
                        {person.member_type && (
                          <Badge variant="outline" className="text-xs">
                            <Building className="w-3 h-3 mr-1" />
                            {person.member_type}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {person.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{person.email}</span>
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{person.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      {person.notes && (
                        <div className="flex items-start gap-1 text-sm text-muted-foreground">
                          <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{person.notes}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 text-right text-xs text-muted-foreground">
                      <span>Added {new Date(person.created_at).toLocaleDateString()}</span>
                      {person.user_id && (
                        <Badge variant="secondary" className="text-xs">
                          Has Account
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}