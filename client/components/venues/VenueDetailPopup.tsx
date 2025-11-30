"use client";

import { Popup } from "@/components/ui/popup";
import { Badge } from "@/components/ui/badge";

interface VenueDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: {
    name: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    capacity?: number | null;
    notes?: string | null;
    created_at?: string;
    promoters?: Array<{
      id: string;
      name: string;
      company?: string | null;
      is_primary?: boolean;
    }>;
  };
}

export function VenueDetailPopup({
  open,
  onOpenChange,
  venue,
}: VenueDetailPopupProps) {
  return (
    <Popup title="Venue Details" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        {/* Name & Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <p className="font-header text-lg">{venue.name}</p>
            <Badge
              className="bg-badge-secondary-bg text-badge-secondary-text"
              variant="secondary"
            >
              Venue
            </Badge>
          </div>
          <div className="space-y-1">
            {/* Address */}
            {venue.address && (
              <div className="flex items-start gap-2 text-sm text-description-foreground">
                <p>{venue.address}</p>
              </div>
            )}
            {/* Location */}
            {(venue.city || venue.country) && (
              <div className="flex items-start gap-2 text-sm text-description-foreground">
                <p>
                  {venue.city || ""}
                  {venue.city && venue.country && ", "}
                  {venue.country || ""}
                </p>
              </div>
            )}
            {/* Capacity */}
            {venue.capacity && (
              <div className="flex items-start gap-2 text-sm text-description-foreground">
                <p>{venue.capacity.toLocaleString()} capacity</p>
              </div>
            )}
          </div>
        </div>

        {/* Promoters */}
        <div className="flex items-start gap-3">
          <div className="flex-1 text-description-foreground">
            <p className="text-lg font-header mb-1">Promoters</p>
            {venue.promoters && venue.promoters.length > 0 ? (
              <div>
                {venue.promoters.map((promoter) => (
                  <ul key={promoter.id}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{promoter.name}</p>
                    </div>
                  </ul>
                ))}
              </div>
            ) : (
              <p className="text-sm">N/A</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1 text-description-foreground">
          <p className="text-lg font-header">Notes</p>
          {venue.notes ? (
            <p className="text-sm whitespace-pre-wrap">{venue.notes}</p>
          ) : (
            <p className="text-sm">N/A</p>
          )}
        </div>
      </div>
    </Popup>
  );
}
