'use client'
import { logger } from '@/lib/logger'

import { useState, useEffect } from 'react'
import { ChevronDown, MapPin, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { searchVenues } from '@/lib/actions/venues-search'

interface Venue {
  id: string
  name: string
  city: string | null
  address: string | null
}

interface VenueSearchProps {
  orgId: string
  onVenueSelect: (venue: Venue | null) => void
  onNewVenue: (venueName: string, city: string, address: string) => void
}

export default function VenueSearch({ orgId, onVenueSelect, onNewVenue }: VenueSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [venues, setVenues] = useState<Venue[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showNewVenueForm, setShowNewVenueForm] = useState(false)
  const [newVenueData, setNewVenueData] = useState({
    name: '',
    city: '',
    address: ''
  })

  // Search venues when search term changes
  useEffect(() => {
    const searchDebounced = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true)
        try {
          const results = await searchVenues(orgId, searchTerm)
          setVenues(results)
          setIsDropdownOpen(true)
        } catch (error) {
          logger.error('Error searching venues', error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setVenues([])
        setIsDropdownOpen(false)
      }
    }, 300)

    return () => clearTimeout(searchDebounced)
  }, [searchTerm, orgId])

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue)
    setSearchTerm(`${venue.name} - ${venue.city}`)
    setIsDropdownOpen(false)
    onVenueSelect(venue)
  }

  const handleCreateNewVenue = () => {
    if (newVenueData.name && newVenueData.city) {
      onNewVenue(newVenueData.name, newVenueData.city, newVenueData.address)
      setShowNewVenueForm(false)
      setSearchTerm(`${newVenueData.name} - ${newVenueData.city}`)
      setSelectedVenue(null)
      setNewVenueData({ name: '', city: '', address: '' })
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setSelectedVenue(null)
    onVenueSelect(null)
  }

  if (showNewVenueForm) {
    return (
      <div className="space-y-4 p-4 border border-neutral-700 rounded-lg bg-neutral-900/50">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Create New Venue</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewVenueForm(false)}
          >
            Cancel
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Venue Name *</label>
            <Input
              value={newVenueData.name}
              onChange={(e) => setNewVenueData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter venue name"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">City *</label>
            <Input
              value={newVenueData.city}
              onChange={(e) => setNewVenueData(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Enter city"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Address</label>
          <Input
            value={newVenueData.address}
            onChange={(e) => setNewVenueData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Enter full address (optional)"
          />
        </div>
        
        <Button
          type="button"
          onClick={handleCreateNewVenue}
          disabled={!newVenueData.name || !newVenueData.city}
          className="w-full"
        >
          Create Venue
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Venue *
      </label>
      
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search for existing venue or type new venue name..."
          className="pr-10"
        />
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
          {isSearching ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          ) : venues.length > 0 ? (
            <>
              {venues.map((venue) => (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => handleVenueSelect(venue)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="font-medium">{venue.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {venue.city}{venue.address && ` • ${venue.address}`}
                    </div>
                  </div>
                </button>
              ))}
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowNewVenueForm(true)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create new venue &ldquo;{searchTerm}&rdquo;
                </button>
              </div>
            </>
          ) : searchTerm.length >= 2 ? (
            <button
              type="button"
              onClick={() => setShowNewVenueForm(true)}
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create new venue &ldquo;{searchTerm}&rdquo;
            </button>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Type at least 2 characters to search venues
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="venueId" value={selectedVenue?.id || ''} />
      <input type="hidden" name="venueName" value={newVenueData.name} />
      <input type="hidden" name="venueCity" value={newVenueData.city} />
      <input type="hidden" name="venueAddress" value={newVenueData.address} />
    </div>
  )
}