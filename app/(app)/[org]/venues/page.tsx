import { getSupabaseServer } from '@/lib/supabase/server'
import { getVenuesWithShowCounts } from '@/lib/actions/venues'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Globe, Calendar, Users, Building } from 'lucide-react'
import Link from 'next/link'

interface VenuesPageProps {
  params: Promise<{ org: string }>
}

export default async function VenuesPage({ params }: VenuesPageProps) {
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

  // Get venues with show counts using server action
  const allVenues = await getVenuesWithShowCounts(org.id)

  // Get show counts
  const totalShows = allVenues.reduce((sum, venue) => sum + (venue.shows?.[0]?.count || 0), 0)

  return (
    <div className="mb-16 mt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Venues</h1>
          <p className="mt-2 text-foreground/50">Manage venue contacts, technical specs, and show history</p>
        </div>
        {/* TODO: Add venue button */}
      </div>

      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{allVenues.length}</p>
                  <p className="text-xs text-muted-foreground">Total Venues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{totalShows}</p>
                  <p className="text-xs text-muted-foreground">Total Shows</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{allVenues.filter(v => v.city).length}</p>
                  <p className="text-xs text-muted-foreground">Cities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Venues */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              <CardTitle className="text-lg">All Venues ({allVenues.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {allVenues.length === 0 ? (
              <div className="text-center py-12">
                <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No venues added yet. Add your first venue to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allVenues.map((venue) => {
                  const showCount = venue.shows?.[0]?.count || 0
                  return (
                    <Link
                      key={venue.id}
                      href={`/${orgSlug}/venues/${venue.id}`}
                      className="block rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{venue.name}</h4>
                            {showCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {showCount} show{showCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {venue.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{venue.city}{venue.country && `, ${venue.country}`}</span>
                              </div>
                            )}
                            {venue.address && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span className="truncate max-w-xs">{venue.address}</span>
                              </div>
                            )}
                          </div>
                          
                          {venue.contacts && (
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>Contact info available</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 text-right text-xs text-muted-foreground">
                          <span>Added {new Date(venue.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric'
                          })}</span>
                          {venue.capacity && (
                            <Badge variant="outline" className="text-xs">
                              Cap. {venue.capacity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
