"use client";

import { MapPin, Calendar } from "lucide-react";

interface HotelPanelProps {
  advancingFields: Array<{ field_name: string; value: unknown }>;
  assignedPeople: Array<{
    person_id: string;
    duty: string | null;
    people: {
      id: string;
      name: string;
      member_type: string | null;
    } | null;
  }>;
}

export function HotelPanel({ advancingFields, assignedPeople }: HotelPanelProps) {
  // Check for promoter accommodation general info
  const promoterAccommodation = advancingFields.find(f => f.field_name === 'promoter_accommodation')?.value as string | undefined;
  
  // Extract hotel information for assigned people (artist-specific)
  const hotelData = assignedPeople
    .map((person) => {
      if (!person.people) return null;
      
      const personId = person.person_id;
      const name = advancingFields.find(f => f.field_name === `hotel_${personId}_name`)?.value as string | undefined;
      const checkIn = advancingFields.find(f => f.field_name === `hotel_${personId}_checkIn`)?.value as string | undefined;
      const checkOut = advancingFields.find(f => f.field_name === `hotel_${personId}_checkOut`)?.value as string | undefined;
      const address = advancingFields.find(f => f.field_name === `hotel_${personId}_address`)?.value as string | undefined;
      
      if (!name && !checkIn && !checkOut) return null;
      
      return {
        personName: person.people.name,
        hotelName: name,
        checkIn,
        checkOut,
        address,
      };
    })
    .filter(Boolean);

  // Show empty state only if no data at all
  if (hotelData.length === 0 && !promoterAccommodation) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-400" />
          Hotel
        </h3>
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <p className="text-sm text-neutral-400">
            No hotel information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Hotel details will be shown here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-purple-400" />
        Hotel
      </h3>
      <div className="space-y-3">
        {/* Show promoter general accommodation info if available */}
        {promoterAccommodation && (
          <div className="bg-neutral-800/50 rounded-lg p-4">
            <div className="text-sm text-neutral-300 whitespace-pre-wrap">
              {promoterAccommodation}
            </div>
          </div>
        )}
        
        {/* Show per-person hotel data */}
        {hotelData.map((hotel, idx) => (
          <div key={idx} className="bg-neutral-800/50 rounded-lg p-4">
            <div className="font-medium text-sm mb-2">{hotel!.personName}</div>
            {hotel!.hotelName && (
              <div className="text-sm text-neutral-300 mb-2">{hotel!.hotelName}</div>
            )}
            {(hotel!.checkIn || hotel!.checkOut) && (
              <div className="flex items-center gap-1 text-xs text-neutral-400 mb-1">
                <Calendar className="w-3 h-3" />
                {hotel!.checkIn && <span>Check-in: {new Date(hotel!.checkIn).toLocaleDateString()}</span>}
                {hotel!.checkIn && hotel!.checkOut && <span className="mx-1">•</span>}
                {hotel!.checkOut && <span>Check-out: {new Date(hotel!.checkOut).toLocaleDateString()}</span>}
              </div>
            )}
            {hotel!.address && (
              <div className="text-xs text-neutral-500">{hotel!.address}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
