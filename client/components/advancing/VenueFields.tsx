import { logger } from '@/lib/logger'
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getVenuesByOrg } from "@/lib/actions/venues-search";
import { getVenueCache, setVenueCache } from "@/lib/venue-cache";

interface Venue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
}

interface VenueFieldsProps {
  orgId: string;
  onVenueSelect: (venue: Venue | null) => void;
}

export default function VenueFields({
  orgId,
  onVenueSelect,
}: VenueFieldsProps) {
  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Load venues on mount (with caching)
  useEffect(() => {
    const loadVenues = async () => {
      // Check cache first
      const cached = getVenueCache(orgId);
      if (cached.length > 0) {
        setAllVenues(cached);
        return;
      }

      try {
        const venues = await getVenuesByOrg(orgId);
        setVenueCache(orgId, venues);
        setAllVenues(venues);
      } catch (error) {
        logger.error("`Error loading venues", error);
      }
    };

    loadVenues();
  }, [orgId]);

  // Filter venues based on current inputs
  useEffect(() => {
    if (!venueName && !venueCity && !venueAddress) {
      setFilteredVenues([]);
      return;
    }

    const filtered = allVenues.filter((venue) => {
      const nameMatch =
        !venueName ||
        venue.name.toLowerCase().includes(venueName.toLowerCase());
      const cityMatch =
        !venueCity ||
        (venue.city &&
          venue.city.toLowerCase().includes(venueCity.toLowerCase()));
      const addressMatch =
        !venueAddress ||
        (venue.address &&
          venue.address.toLowerCase().includes(venueAddress.toLowerCase()));
      return nameMatch && cityMatch && addressMatch;
    });

    setFilteredVenues(filtered.slice(0, 8)); // Limit to 8 suggestions
  }, [venueName, venueCity, venueAddress, allVenues]);

  // Handle venue selection from dropdown
  const handleVenueSelect = (venue: Venue) => {
    setVenueName(venue.name);
    setVenueCity(venue.city || "");
    setVenueAddress(venue.address || "");
    setSelectedVenue(venue);
    setShowSuggestions(false);
    onVenueSelect(venue);
  };

  // Handle input changes
  const handleNameChange = (value: string) => {
    setVenueName(value);
    setSelectedVenue(null);
    onVenueSelect(null);
    setShowSuggestions(value.length > 0);
  };

  // const handleCityChange = (value: string) => {
  //   setVenueCity(value)
  //   setSelectedVenue(null)
  //   onVenueSelect(null)
  //   setShowSuggestions(value.length > 0)
  // }

  // const handleAddressChange = (value: string) => {
  //   setVenueAddress(value)
  //   setSelectedVenue(null)
  //   onVenueSelect(null)
  // }

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {/* Venue Name Field - designed to be used in parent grid */}
      <div>
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          htmlFor="venue_name"
        >
          Venue Name *
        </label>
        <Input
          id="venue_name"
          name="venueName"
          placeholder="Enter venue name"
          value={venueName}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => {
            if (venueName) setShowSuggestions(true);
          }}
          required
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredVenues.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredVenues.map((venue) => (
            <div
              key={venue.id}
              className="px-3 py-2 hover:bg-neutral-800 cursor-pointer border-b border-neutral-700 last:border-b-0"
              onClick={() => handleVenueSelect(venue)}
            >
              <div className="font-medium">{venue.name}</div>
              {venue.city && (
                <div className="text-sm text-neutral-400">{venue.city}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {selectedVenue && (
        <input type="hidden" name="venueId" value={selectedVenue.id} />
      )}
    </div>
  );
}
