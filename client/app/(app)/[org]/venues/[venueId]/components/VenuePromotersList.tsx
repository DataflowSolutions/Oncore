"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  Phone,
  Building,
  MapPin,
  Trash2,
  Star,
} from "lucide-react";
import { LinkPromoterToVenueModal } from "./LinkPromoterToVenueModal";
import { unlinkPromoterFromVenue } from "@/lib/actions/promoters";
import { toast } from "sonner";
import type { Promoter } from "@/lib/actions/promoters";
import { logger } from "@/lib/logger";
import { PromoterDetailPopup } from "@/components/contacts/PromoterDetailPopup";

interface VenuePromotersListProps {
  venueId: string;
  venueName: string;
  promoters: (Promoter & { is_primary?: boolean })[];
  orgId: string;
}

export function VenuePromotersList({
  venueId,
  venueName,
  promoters,
  orgId,
}: VenuePromotersListProps) {
  const router = useRouter();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [selectedPromoter, setSelectedPromoter] = useState<
    (Promoter & { is_primary?: boolean }) | null
  >(null);

  const handleUnlink = async (promoterId: string, promoterName: string) => {
    if (!confirm(`Remove ${promoterName} from this venue?`)) {
      return;
    }

    setUnlinkingId(promoterId);
    try {
      const result = await unlinkPromoterFromVenue(venueId, promoterId);

      if (result.success) {
        toast.success("Promoter removed from venue");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to remove promoter");
      }
    } catch (error) {
      logger.error("Error unlinking promoter", error);
      toast.error("Failed to remove promoter");
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <CardTitle className="text-lg">
                Promoters for {venueName} ({promoters.length})
              </CardTitle>
            </div>
            <LinkPromoterToVenueModal
              venueId={venueId}
              venueName={venueName}
              orgId={orgId}
              linkedPromoterIds={promoters.map((p) => p.id)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {promoters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No promoters linked to this venue yet
              </p>
              <p className="text-sm text-muted-foreground">
                Click &quot;Link Promoter&quot; above to add promoters who work
                with this venue
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoters.map((promoter) => (
                <div
                  key={promoter.id}
                  className="rounded-lg border border-input bg-card text-foreground shadow-sm p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedPromoter(promoter)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">
                              {promoter.name}
                            </h4>
                            {promoter.is_primary && (
                              <Badge variant="default" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Primary Contact
                              </Badge>
                            )}
                          </div>
                          {promoter.company && (
                            <Badge variant="outline" className="text-xs">
                              <Building className="w-3 h-3 mr-1" />
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
                            {promoter.city && promoter.country && ", "}
                            {promoter.country}
                          </span>
                        </div>
                      )}

                      {/* Contact Info */}
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

                      {/* Notes */}
                      {promoter.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t border-border/50">
                          {promoter.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      className="flex sm:flex-col gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUnlink(promoter.id, promoter.name)}
                        disabled={unlinkingId === promoter.id}
                      >
                        <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Remove</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promoter Detail Popup */}
      {selectedPromoter && (
        <PromoterDetailPopup
          open={!!selectedPromoter}
          onOpenChange={(open) => !open && setSelectedPromoter(null)}
          promoter={{
            name: selectedPromoter.name,
            email: selectedPromoter.email,
            phone: selectedPromoter.phone,
            company: selectedPromoter.company,
            city: selectedPromoter.city,
            country: selectedPromoter.country,
            role: selectedPromoter.type,
            notes: selectedPromoter.notes,
            status: selectedPromoter.status,
            created_at: selectedPromoter.created_at,
          }}
        />
      )}
    </div>
  );
}
