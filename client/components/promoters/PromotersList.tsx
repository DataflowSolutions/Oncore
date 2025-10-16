'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { PromoterCard } from './PromoterCard'
import { PromoterSearchbar } from './PromoterSearchbar'
import { AddPromoterModal } from './AddPromoterModal'
import type { PromoterWithVenues } from '@/lib/actions/promoters'

interface PromotersListProps {
  promoters: PromoterWithVenues[]
  orgId: string
}

export function PromotersList({ promoters, orgId }: PromotersListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter promoters based on search query
  const filteredPromoters = useMemo(() => {
    if (!searchQuery.trim()) {
      return promoters
    }

    const query = searchQuery.toLowerCase()

    return promoters.filter((promoter) => {
      const nameMatch = promoter.name?.toLowerCase().includes(query)
      const emailMatch = promoter.email?.toLowerCase().includes(query)
      const companyMatch = promoter.company?.toLowerCase().includes(query)
      const cityMatch = promoter.city?.toLowerCase().includes(query)
      const countryMatch = promoter.country?.toLowerCase().includes(query)
      const venueMatch = promoter.venues?.some((venue) =>
        venue.name.toLowerCase().includes(query)
      )

      return (
        nameMatch ||
        emailMatch ||
        companyMatch ||
        cityMatch ||
        countryMatch ||
        venueMatch
      )
    })
  }, [promoters, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <PromoterSearchbar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <AddPromoterModal orgId={orgId} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <CardTitle className="text-lg">
              All Promoters ({filteredPromoters.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPromoters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery.trim()
                  ? 'No promoters found matching your search.'
                  : 'No promoters added yet. Add your first promoter to get started!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPromoters.map((promoter) => (
                <PromoterCard
                  key={promoter.id}
                  promoter={promoter}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
