"use client";

import { Popup } from "@/components/ui/popup";
import { EditableText } from "@/components/ui/editable-text";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

interface PromoterDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoter: {
    id?: string;
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
  onUpdate?: (updates: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => Promise<void>;
}

export function PromoterDetailPopup({
  open,
  onOpenChange,
  promoter,
  onUpdate,
}: PromoterDetailPopupProps) {
  const sanitize = (val: string) => {
    const trimmed = val.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const handleUpdate = async (updates: {
    name?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => {
    if (onUpdate) {
      await onUpdate(updates);
    }
  };

  return (
    <Popup title="Promoter Details" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        {/* Name & Status */}

        <div className="space-y-1">
          <div className="flex items-center gap-4">
            {onUpdate ? (
              <EditableText
                value={promoter.name}
                onSave={(v) => handleUpdate({ name: sanitize(v) })}
                placeholder="Name"
                className={cn("font-header text-lg", inlineEditButtonClasses)}
              />
            ) : (
              <p className="font-header text-lg">{promoter.name}</p>
            )}
            <Badge
              className="bg-badge-secondary-bg text-badge-secondary-text"
              variant="secondary"
            >
              Promoter
            </Badge>
          </div>
          <div>
            <div>
              {onUpdate ? (
                <EditableText
                  value={promoter.phone || ""}
                  onSave={(v) => handleUpdate({ phone: sanitize(v) })}
                  placeholder="N/A"
                  inputType="tel"
                  className={cn(
                    "text-sm text-description-foreground",
                    inlineEditButtonClasses
                  )}
                />
              ) : promoter.phone ? (
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
              {onUpdate ? (
                <EditableText
                  value={promoter.email || ""}
                  onSave={(v) => handleUpdate({ email: sanitize(v) })}
                  placeholder="N/A"
                  inputType="email"
                  className={cn(
                    "text-sm text-description-foreground break-all",
                    inlineEditButtonClasses
                  )}
                />
              ) : promoter.email ? (
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
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <p className="text-lg font-header">Notes</p>
          </div>
          {onUpdate ? (
            <EditableText
              value={promoter.notes || ""}
              onSave={(v) => handleUpdate({ notes: sanitize(v) })}
              placeholder="Add notes..."
              multiline
              className={cn(
                "text-sm whitespace-pre-wrap",
                inlineEditButtonClasses
              )}
            />
          ) : promoter.notes ? (
            <p className="text-sm whitespace-pre-wrap">{promoter.notes}</p>
          ) : (
            <p className="text-sm">N/A</p>
          )}
        </div>
      </div>
    </Popup>
  );
}
