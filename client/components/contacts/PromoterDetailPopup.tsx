"use client";

import { Popup } from "@/components/ui/popup";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin } from "lucide-react";

interface PromoterDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoter: {
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    city?: string | null;
    country?: string | null;
    role?: string | null;
    notes?: string | null;
    status?: string | null;
    created_at?: string;
    venues?: Array<{
      id: string;
      name: string;
      city?: string | null;
      is_primary?: boolean;
    }>;
  };
}

export function PromoterDetailPopup({
  open,
  onOpenChange,
  promoter,
}: PromoterDetailPopupProps) {
  return (
    <Popup title="Promoter Details" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        {/* Name & Status */}

        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <p className="font-header text-lg">{promoter.name}</p>
            <Badge
              className="bg-badge-secondary-bg text-badge-secondary-text"
              variant="secondary"
            >
              Promoter
            </Badge>
          </div>
          <div>
            <div>
              {promoter.phone ? (
                <Link
                  href={`tel:${promoter.phone}`}
                  className="text-sm text-description-foreground hover:underline"
                >
                  {promoter.phone}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
            <div>
              {promoter.email ? (
                <Link
                  href={`mailto:${promoter.email}`}
                  className="text-sm text-description-foreground hover:underline break-all"
                >
                  {promoter.email}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex-1 text-description-foreground ">
          <p className="text-lg font-header mb-2">Venues</p>
          {promoter.venues && promoter.venues.length > 0 ? (
            <div className="space-y-2">
              {promoter.venues.map((venue) => (
                <div
                  key={venue.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{venue.name}</p>
                    {venue.city && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground ">
                          {venue.city}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm">N/A</p>
          )}
        </div>

        {/* Phone */}

        {/* Notes */}
        <div className="space-y-1 text-description-foreground">
          <p className="text-lg font-header">Notes</p>
          {promoter.notes ? (
            <p className="text-sm whitespace-pre-wrap">{promoter.notes}</p>
          ) : (
            <p className="text-sm">N/A</p>
          )}
        </div>
      </div>
    </Popup>
  );
}
