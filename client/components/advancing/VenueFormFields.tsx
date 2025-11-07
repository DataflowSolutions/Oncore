'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { getVenuesByOrg } from '@/lib/actions/venues-search'
import { getVenueCache, setVenueCache } from '@/lib/venue-cache'

interface Venue {
  id: string
  name: string
  city: string | null
  address: string | null
}

interface VenueFormFieldsProps {
  orgId: string
  onVenueSelect: (venue: Venue | null) => void
}

export default function VenueFormFields({ orgId, onVenueSelect }: VenueFormFieldsProps) {
  const [venueName, setVenueName] = useState('')
  const [venueCity, setVenueCity] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [allVenues, setAllVenues] = useState<Venue[]>([])
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)

  // Load venues on mount (with caching)
  useEffect(() => {
    const loadVenues = async () => {
      const cached = getVenueCache(orgId)
      if (cached.length > 0) {
        setAllVenues(cached)
        return
      }

      try {
        const venues = await getVenuesByOrg(orgId)
        setVenueCache(orgId, venues)
        setAllVenues(venues)
      } catch (error) {
        logger.error('Error loading venues', error)
      }
    }

    loadVenues()
  }, [orgId])

  // Filter venues based on current inputs
  useEffect(() => {
    if (!venueName && !venueCity && !venueAddress) {
      setFilteredVenues([])
      return
    }

    const filtered = allVenues.filter(venue => {
      const nameMatch = !venueName || venue.name.toLowerCase().includes(venueName.toLowerCase())
      const cityMatch = !venueCity || (venue.city && venue.city.toLowerCase().includes(venueCity.toLowerCase()))
      const addressMatch = !venueAddress || (venue.address && venue.address.toLowerCase().includes(venueAddress.toLowerCase()))
      return nameMatch && cityMatch && addressMatch
    })

    setFilteredVenues(filtered.slice(0, 8))
  }, [venueName, venueCity, venueAddress, allVenues])

  // Handle venue selection from dropdown
  const handleVenueSelect = (venue: Venue) => {
    setVenueName(venue.name)
    setVenueCity(venue.city || '')
    setVenueAddress(venue.address || '')
    setSelectedVenue(venue)
    setShowSuggestions(false)
    onVenueSelect(venue)
  }

  // Handle input changes
  const handleNameChange = (value: string) => {
    setVenueName(value)
    setSelectedVenue(null)
    onVenueSelect(null)
    setShowSuggestions(value.length > 0)
  }

  const handleCityChange = (value: string) => {
    setVenueCity(value)
    setSelectedVenue(null)
    onVenueSelect(null)
    setShowSuggestions(value.length > 0)
  }

  const handleAddressChange = (value: string) => {
    setVenueAddress(value)
    setSelectedVenue(null)
    onVenueSelect(null)
  }

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* Return venue fields that integrate properly into parent grid */}
      
      {/* Venue Name Field with better dropdown */}
      <div className="relative">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="venue_name">
          Venue Name *
        </label>
        <Input
          id="venue_name"
          name="venueName"
          placeholder="Enter venue name"
          value={venueName}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => {
            if (venueName.length > 0) setShowSuggestions(true)
          }}
          required
        />
        
        {/* Enhanced suggestions dropdown with create new option */}
        {showSuggestions && venueName.length > 0 && (
          <div 
            ref={suggestionRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {/* Existing venues */}
            {filteredVenues.map((venue) => (
              <div
                key={venue.id}
                className="px-4 py-3 hover:bg-neutral-800 cursor-pointer border-b border-neutral-700 last:border-b-0 flex items-start gap-3"
                onClick={() => handleVenueSelect(venue)}
              >
                <div className="w-8 h-8 bg-neutral-700 rounded-md flex items-center justify-center text-xs font-medium">
                  {venue.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{venue.name}</div>
                  <div className="text-sm text-neutral-400 truncate">
                    {venue.city}{venue.address && `, ${venue.address}`}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Create new venue option */}
            <div
              className="px-4 py-3 hover:bg-neutral-800 cursor-pointer border-t border-neutral-600 bg-neutral-800/50"
              onClick={() => {
                setShowSuggestions(false)
                // Keep current values for new venue creation
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 border border-primary/30 rounded-md flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-primary">Create &ldquo;{venueName}&rdquo;</div>
                  <div className="text-sm text-neutral-400">Add as new venue</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* City Field */}
      <div>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="venue_city">
          City *
        </label>
        <Input
          id="venue_city"
          name="venueCity"
          placeholder="Enter city"
          value={venueCity}
          onChange={(e) => handleCityChange(e.target.value)}
          onFocus={() => {
            if (venueCity.length > 0) setShowSuggestions(true)
          }}
          required
        />
      </div>

      {/* Address Field */}
      <div>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="venue_address">
          Address
        </label>
        <Input
          id="venue_address"
          name="venueAddress"
          placeholder="Enter venue address"
          value={venueAddress}
          onChange={(e) => handleAddressChange(e.target.value)}
        />
      </div>

      {/* Hidden inputs for form submission */}
      {selectedVenue && (
        <input type="hidden" name="venueId" value={selectedVenue.id} />
      )}
    </>
  )
}