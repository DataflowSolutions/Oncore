"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import {
  GeneralSection,
  DealSection,
  HotelSection,
  FoodSection,
  FlightsSection,
  ActivitiesSection,
  DocumentsSection,
  ContactsSection,
  TechnicalSection,
} from "./sections";

import type { ImportData } from "./types";
import { createEmptyImportData } from "./types";

interface ImportConfirmationPageProps {
  orgId: string;
  orgSlug: string;
  initialData?: Partial<ImportData>;
  jobId?: string;
  onCancel?: () => void;
}

/**
 * Import Confirmation Page Component
 * 
 * This is the "after import" review page where users can verify and edit
 * all extracted data before creating a show.
 * 
 * Sections:
 * - General (Artist, Event, Venue, Date, etc.)
 * - Deal (Fee, Payment terms, etc.)
 * - Hotel (Multi-item with navigation)
 * - Food (Multi-item with navigation)
 * - Flights (Multi-item with navigation)
 * - Activities & Transfers (Multi-item with navigation)
 * - Documents (List with categories)
 * - Contacts (Grid of contacts)
 * - Technical (Equipment, Backline, etc.)
 */
export function ImportConfirmationPage({
  orgId,
  orgSlug,
  initialData,
  jobId,
  onCancel,
}: ImportConfirmationPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize state with provided data or empty defaults
  const [data, setData] = useState<ImportData>(() => ({
    ...createEmptyImportData(),
    ...initialData,
  }));

  // Update handlers for each section
  const updateGeneral = (general: ImportData["general"]) => {
    setData((prev) => ({ ...prev, general }));
  };

  const updateDeal = (deal: ImportData["deal"]) => {
    setData((prev) => ({ ...prev, deal }));
  };

  const updateHotels = (hotels: ImportData["hotels"]) => {
    setData((prev) => ({ ...prev, hotels }));
  };

  const updateFood = (food: ImportData["food"]) => {
    setData((prev) => ({ ...prev, food }));
  };

  const updateFlights = (flights: ImportData["flights"]) => {
    setData((prev) => ({ ...prev, flights }));
  };

  const updateActivities = (activities: ImportData["activities"]) => {
    setData((prev) => ({ ...prev, activities }));
  };

  const updateDocuments = (documents: ImportData["documents"]) => {
    setData((prev) => ({ ...prev, documents }));
  };

  const updateContacts = (contacts: ImportData["contacts"]) => {
    setData((prev) => ({ ...prev, contacts }));
  };

  const updateTechnical = (technical: ImportData["technical"]) => {
    setData((prev) => ({ ...prev, technical }));
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/${orgSlug}/shows`);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!data.general.date) {
      toast.error("Date is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/shows/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "commit",
          orgId,
          jobId,
          payload: {
            // Core show data
            title: data.general.eventName || data.general.venue || "Imported Show",
            date: data.general.date,
            setTime: data.general.setTime,
            venueName: data.general.venue,
            city: data.general.city,
            country: data.general.country,
            artistName: data.general.artist,
            
            // Deal data
            deal: data.deal,
            
            // Related data
            hotels: data.hotels,
            food: data.food,
            flights: data.flights,
            activities: data.activities,
            documents: data.documents,
            contacts: data.contacts,
            technical: data.technical,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save import");
      }

      toast.success("Import saved successfully", {
        description: "Show created from imported data.",
      });

      // Navigate to the new show
      if (result.showId) {
        router.push(`/${orgSlug}/shows/${result.showId}/day`);
      } else {
        router.push(`/${orgSlug}/shows`);
      }
      router.refresh();
    } catch (error) {
      logger.error("Error saving import", error);
      const message = error instanceof Error ? error.message : "Failed to save import";
      toast.error("Could not save import", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
          <GeneralSection data={data.general} onChange={updateGeneral} />
          
          <div className="h-px bg-border" />
          
          <DealSection data={data.deal} onChange={updateDeal} />
          
          <div className="h-px bg-border" />
          
          <HotelSection data={data.hotels} onChange={updateHotels} />
          
          <div className="h-px bg-border" />
          
          <FoodSection data={data.food} onChange={updateFood} />
          
          <div className="h-px bg-border" />
          
          <FlightsSection data={data.flights} onChange={updateFlights} />
          
          <div className="h-px bg-border" />
          
          <ActivitiesSection data={data.activities} onChange={updateActivities} />
          
          <div className="h-px bg-border" />
          
          <DocumentsSection data={data.documents} onChange={updateDocuments} />
          
          <div className="h-px bg-border" />
          
          <ContactsSection data={data.contacts} onChange={updateContacts} />
          
          <div className="h-px bg-border" />
          
          <TechnicalSection data={data.technical} onChange={updateTechnical} />
        </div>
      </ScrollArea>

      {/* Fixed footer with actions */}
      <div className="border-t bg-background p-4">
        <div className="max-w-5xl mx-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save & Create Show"}
          </Button>
        </div>
      </div>
    </div>
  );
}
