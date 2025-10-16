'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, Users, Building, Mail, Phone } from 'lucide-react'
import type { PromoterWithVenues } from '@/lib/actions/promoters'

interface Venue {
  id: string
  name: string
  city: string | null
  country: string | null
  address: string | null
  capacity: number | null
  contacts: unknown
  created_at: string
  shows?: Array<{ count: number }>
}

interface UnifiedSearchResultsProps {
  venues: Venue[]
  promoters: PromoterWithVenues[]
  searchQuery: string
  orgSlug: string
}

export function UnifiedSearchResults({
  venues,
  promoters,
  searchQuery,
  orgSlug,
}: UnifiedSearchResultsProps) {
  const hasVenues = venues.length > 0
  const hasPromoters = promoters.length > 0
  const hasResults = hasVenues || hasPromoters

  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No venues or promoters found matching &quot;{searchQuery}&quot;
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Venues Results */}
      {hasVenues && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              <CardTitle className="text-lg">
                Venues ({venues.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {venues.map((venue) => {
                const showCount = venue.shows?.[0]?.count || 0
                return (
                  <Link
                    key={venue.id}
                    href={`/${orgSlug}/venues/${venue.id}`}
                    className="block rounded-lg border border-input bg-card text-foreground shadow-sm p-2.5 sm:p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Header with name and badges */}
                      <div className="flex flex-col gap-1.5">
                        <h4 className="font-semibold text-foreground text-sm">
                          {venue.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {showCount > 0 && (
                            <Badge variant="secondary" className="text-xs h-5">
                              <Calendar className="w-3 h-3 mr-1" />
                              {showCount} show{showCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {venue.capacity && (
                            <Badge variant="outline" className="text-xs h-5">
                              <Building className="w-3 h-3 mr-1" />
                              Cap. {venue.capacity}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                          {venue.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>
                                {venue.city}
                                {venue.country && `, ${venue.country}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promoters Results */}
      {hasPromoters && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle className="text-lg">
                Promoters ({promoters.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {promoters.map((promoter) => (
                <div
                  key={promoter.id}
                  className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col gap-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">
                          {promoter.name}
                        </h4>
                        {promoter.company && (
                          <Badge variant="outline" className="text-xs mt-1">
                            <Building className="w-3 h-3 mr-1" />
                            {promoter.company}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    {(promoter.city || promoter.country) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {promoter.city}
                          {promoter.city && promoter.country && ', '}
                          {promoter.country}
                        </span>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {promoter.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{promoter.email}</span>
                        </div>
                      )}
                      {promoter.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          <span>{promoter.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Linked Venues */}
                    {promoter.venues && promoter.venues.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Linked to {promoter.venues.length} venue{promoter.venues.length !== 1 ? 's' : ''}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {promoter.venues.slice(0, 3).map((venue) => (
                            <Link
                              key={venue.id}
                              href={`/${orgSlug}/venues/${venue.id}?view=promoters`}
                              className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {venue.name}
                            </Link>
                          ))}
                          {promoter.venues.length > 3 && (
                            <span className="text-xs text-muted-foreground px-2 py-0.5">
                              +{promoter.venues.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
