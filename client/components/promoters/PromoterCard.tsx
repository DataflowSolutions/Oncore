'use client'

import { Mail, Phone, Building, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PromoterWithVenues } from '@/lib/actions/promoters'

interface PromoterCardProps {
  promoter: PromoterWithVenues
}

export function PromoterCard({ promoter }: PromoterCardProps) {
  const venueCount = promoter.venues?.length || 0

  return (
    <div className="rounded-lg border border-input bg-card text-foreground shadow-sm p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200">
      <div className="flex flex-col gap-3">
        {/* Header with name and badges */}
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold text-foreground text-base">
            {promoter.name}
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            {venueCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Building className="w-3 h-3 mr-1" />
                {venueCount} venue{venueCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {promoter.company && (
              <Badge variant="outline" className="text-xs">
                {promoter.company}
              </Badge>
            )}
          </div>
        </div>

        {/* Location */}
        {(promoter.city || promoter.country) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {promoter.city}
              {promoter.city && promoter.country && ', '}
              {promoter.country}
            </span>
          </div>
        )}

        {/* Contact Information */}
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          {promoter.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <a
                href={`mailto:${promoter.email}`}
                className="hover:text-primary hover:underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {promoter.email}
              </a>
            </div>
          )}
          {promoter.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <a
                href={`tel:${promoter.phone}`}
                className="hover:text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {promoter.phone}
              </a>
            </div>
          )}
        </div>

        {/* Linked Venues */}
        {promoter.venues && promoter.venues.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-1.5">
              Manages:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {promoter.venues.map((venue) => (
                <Badge
                  key={venue.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {venue.name}
                  {venue.city && ` (${venue.city})`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes Preview */}
        {promoter.notes && (
          <div className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t border-border/50">
            {promoter.notes}
          </div>
        )}

        {/* Footer with date */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <span>
            Added{' '}
            {new Date(promoter.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {promoter.status === 'inactive' && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
