"use client";

import { Popup } from "@/components/ui/popup";
import { EditableText } from "@/components/ui/editable-text";
import { Badge } from "@/components/ui/badge";
import { StickyNote, MapPin, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

interface VenueDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: {
    id?: string;
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
  onUpdate?: (updates: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    capacity?: number;
    notes?: string;
  }) => Promise<void>;
}

export function VenueDetailPopup({
  open,
  onOpenChange,
  venue,
  onUpdate,
}: VenueDetailPopupProps) {
  const sanitize = (val: string) => {
    const trimmed = val.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const handleUpdate = async (updates: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    capacity?: number;
    notes?: string;
  }) => {
    if (onUpdate) {
      await onUpdate(updates);
    }
  };

  return (
    <Popup title="Venue Details" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        {/* Name & Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            {onUpdate ? (
              <EditableText
                value={venue.name}
                onSave={(v) => handleUpdate({ name: sanitize(v) })}
                placeholder="Venue name"
                className={cn("font-header text-lg", inlineEditButtonClasses)}
              />
            ) : (
              <p className="font-header text-lg">{venue.name}</p>
            )}
            <Badge
              className="bg-badge-secondary-bg text-badge-secondary-text"
              variant="secondary"
            >
              Venue
            </Badge>
          </div>
          <div className="space-y-2">
            {/* Address */}
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              {onUpdate ? (
                <EditableText
                  value={venue.address || ""}
                  onSave={(v) => handleUpdate({ address: sanitize(v) })}
                  placeholder="Address"
                  className={cn(
                    "text-sm text-description-foreground",
                    inlineEditButtonClasses
                  )}
                />
              ) : venue.address ? (
                <p className="text-sm text-description-foreground">
                  {venue.address}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-1">
                {onUpdate ? (
                  <>
                    <EditableText
                      value={venue.city || ""}
                      onSave={(v) => handleUpdate({ city: sanitize(v) })}
                      placeholder="City"
                      className={cn(
                        "text-sm text-description-foreground",
                        inlineEditButtonClasses
                      )}
                    />
                    <span className="text-muted-foreground">,</span>
                    <EditableText
                      value={venue.country || ""}
                      onSave={(v) => handleUpdate({ country: sanitize(v) })}
                      placeholder="Country"
                      className={cn(
                        "text-sm text-description-foreground",
                        inlineEditButtonClasses
                      )}
                    />
                  </>
                ) : venue.city || venue.country ? (
                  <p className="text-sm text-description-foreground">
                    {venue.city || ""}
                    {venue.city && venue.country && ", "}
                    {venue.country || ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
              </div>
            </div>
            {/* Capacity */}
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              {onUpdate ? (
                <div className="flex items-center gap-1">
                  <EditableText
                    value={venue.capacity?.toString() || ""}
                    onSave={(v) => {
                      const num = parseInt(v, 10);
                      return handleUpdate({
                        capacity: isNaN(num) ? undefined : num,
                      });
                    }}
                    placeholder="0"
                    className={cn(
                      "text-sm text-description-foreground",
                      inlineEditButtonClasses
                    )}
                  />
                  <span className="text-sm text-description-foreground">
                    capacity
                  </span>
                </div>
              ) : venue.capacity ? (
                <p className="text-sm text-description-foreground">
                  {venue.capacity.toLocaleString()} capacity
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
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
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <p className="text-lg font-header">Notes</p>
          </div>
          {onUpdate ? (
            <EditableText
              value={venue.notes || ""}
              onSave={(v) => handleUpdate({ notes: sanitize(v) })}
              placeholder="Add notes..."
              multiline
              className={cn(
                "text-sm whitespace-pre-wrap",
                inlineEditButtonClasses
              )}
            />
          ) : venue.notes ? (
            <p className="text-sm whitespace-pre-wrap">{venue.notes}</p>
          ) : (
            <p className="text-sm">N/A</p>
          )}
        </div>
      </div>
    </Popup>
  );
}
