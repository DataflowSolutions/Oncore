"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Loader2,
  Mail,
  Phone,
  Building,
  MapPin,
  Users,
} from "lucide-react";
import { searchPromoters, linkPromoterToVenue } from "@/lib/actions/promoters";
import { toast } from "sonner";
import type { Promoter } from "@/lib/actions/promoters";
import { logger } from "@/lib/logger";

interface LinkPromoterToVenueModalProps {
  venueId: string;
  venueName: string;
  orgId: string;
  linkedPromoterIds: string[];
}

export function LinkPromoterToVenueModal({
  venueId,
  venueName,
  orgId,
  linkedPromoterIds,
}: LinkPromoterToVenueModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPromoters, setSelectedPromoters] = useState<Set<string>>(
    new Set()
  );
  const [linking, setLinking] = useState(false);

  const loadPromoters = async () => {
    setLoading(true);
    try {
      const result = await searchPromoters(orgId, searchQuery);
      if (result.success && result.data) {
        // Filter out already linked promoters
        const availablePromoters = result.data.filter(
          (p: Promoter) => !linkedPromoterIds.includes(p.id)
        );
        setPromoters(availablePromoters);
      }
    } catch (error) {
      logger.error("Error loading promoters", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPromoters();
    } else {
      // Reset state when modal closes
      setSearchQuery("");
      setSelectedPromoters(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => {
        loadPromoters();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, open]);

  const togglePromoter = (promoterId: string) => {
    const newSelected = new Set(selectedPromoters);
    if (newSelected.has(promoterId)) {
      newSelected.delete(promoterId);
    } else {
      newSelected.add(promoterId);
    }
    setSelectedPromoters(newSelected);
  };

  const handleLink = async () => {
    if (selectedPromoters.size === 0) return;

    setLinking(true);
    try {
      const promises = Array.from(selectedPromoters).map((promoterId) =>
        linkPromoterToVenue({
          venueId,
          promoterId,
          isPrimary: false,
        })
      );
      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast.success(
          `Linked ${successCount} promoter${
            successCount > 1 ? "s" : ""
          } to ${venueName}`
        );
        router.refresh();
        setOpen(false);
      }

      if (failCount > 0) {
        toast.error(
          `Failed to link ${failCount} promoter${failCount > 1 ? "s" : ""}`
        );
      }
    } catch (error) {
      logger.error("Error linking promoters", error);
      toast.error("Failed to link promoters");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Popup
      open={open}
      onOpenChange={setOpen}
      title={`Link Promoters to ${venueName}`}
      description="Select existing promoters to link to this venue. Already linked promoters are hidden."
      trigger={
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Link Promoter
        </Button>
      }
      className="max-w-2xl max-h-[80vh]"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, email, company, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Promoters List */}
        <ScrollArea className="h-[400px] rounded-md border p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : promoters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No promoters found matching your search"
                  : "All promoters are already linked to this venue"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoters.map((promoter) => (
                <div
                  key={promoter.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-all ${
                    selectedPromoters.has(promoter.id)
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/50 hover:bg-accent/50"
                  }`}
                  onClick={() => togglePromoter(promoter.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedPromoters.has(promoter.id)}
                      onCheckedChange={() => togglePromoter(promoter.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm">
                            {promoter.name}
                          </h4>
                          {promoter.company && (
                            <Badge variant="outline" className="text-xs mt-1">
                              <Building className="w-3 h-3 mr-1" />
                              {promoter.company}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      {(promoter.city || promoter.country) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {promoter.city}
                            {promoter.city && promoter.country && ", "}
                            {promoter.country}
                          </span>
                        </div>
                      )}

                      {/* Contact */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {promoter.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{promoter.email}</span>
                          </div>
                        )}
                        {promoter.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            <span>{promoter.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedPromoters.size} promoter
            {selectedPromoters.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={linking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={selectedPromoters.size === 0 || linking}
            >
              {linking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Link Selected
            </Button>
          </div>
        </div>
      </div>
    </Popup>
  );
}
