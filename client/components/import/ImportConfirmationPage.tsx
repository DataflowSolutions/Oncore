"use client";

import { useEffect, useState } from "react";
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
import { createEmptyImportData, sanitizeImportData } from "./types";
import type { ImportJobStatus } from "@/lib/import/jobs";
import type { DocumentCategory } from "./types";

/**
 * Infer document category from filename
 */
function inferDocumentCategory(fileName: string): DocumentCategory {
  const lower = fileName.toLowerCase();
  if (lower.includes('contract') || lower.includes('agreement')) return 'contract';
  if (lower.includes('rider') || lower.includes('tech') || lower.includes('spec')) return 'rider';
  if (lower.includes('visa') || lower.includes('passport')) return 'visa';
  if (lower.includes('boarding') || lower.includes('flight') || lower.includes('ticket')) return 'boarding_pass';
  return 'other';
}

interface ImportConfirmationPageProps {
  orgId: string;
  orgSlug: string;
  initialData?: Partial<ImportData>;
  jobId?: string;
  confidenceMap?: Record<string, import("@/lib/import/ai").ConfidenceEntry>;
  initialJobStatus?: ImportJobStatus;
  onCancel?: () => void;
  rawSources?: Array<{ id: string; fileName: string }>;
}

type ConfidenceLookup = (path: string) => number | undefined;

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
  confidenceMap,
  initialJobStatus,
  onCancel,
  rawSources,
}: ImportConfirmationPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confidenceByField, setConfidenceByField] = useState<
    Record<string, import("@/lib/import/ai").ConfidenceEntry>
  >(confidenceMap ?? {});
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | undefined>(initialJobStatus);
  const [progressData, setProgressData] = useState<{
    current_section?: string;
    current_source?: string;
    current_chunk?: number;
    total_chunks?: number;
    sections_completed?: number;
    total_sections?: number;
  }>({});
  
  // Convert rawSources to ImportedDocument[] for document section
  const sourceDocuments = (rawSources || []).map((source): import('./types').ImportedDocument => ({
    id: source.id,
    fileName: source.fileName,
    fileSize: 0, // Unknown from sources
    category: inferDocumentCategory(source.fileName),
  }));

  // Initialize state with provided data or empty defaults
  const [data, setData] = useState<ImportData>(() => {
    const base = createEmptyImportData();
    return {
      ...base,
      ...initialData,
      // Pre-populate documents from source files
      documents: sourceDocuments.length > 0 ? sourceDocuments : (initialData?.documents || []),
      warnings: initialData?.warnings ?? base.warnings,
    };
  });

  const confidenceLookup: ConfidenceLookup = (path) => {
    const entry = confidenceByField?.[path];
    if (entry === undefined || entry === null) return undefined;
    if (typeof entry === "number") return entry;
    if (typeof entry === "object" && typeof entry.score === "number") return entry.score;
    return undefined;
  };

  useEffect(() => {
    if (!confidenceMap) return;
    const firstLowConfidence = document.querySelector('[data-low-confidence="true"]');
    if (firstLowConfidence) {
      firstLowConfidence.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [confidenceMap]);

  useEffect(() => {
    if (!jobId) return;
    if (jobStatus === "completed" || jobStatus === "failed") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/import-jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();
        if (cancelled || !job) return;

        if (job.confidence_map) {
          setConfidenceByField(job.confidence_map);
        }

        if (job.progress_data) {
          setProgressData(job.progress_data);
        }

        if (job.status && job.status !== jobStatus) {
          console.log(`[import-ui] Job ${jobId} status: ${job.status}`);
          setJobStatus(job.status);
        }

        if (job.status === "completed" && job.extracted) {
          console.log(`[import-ui] Job ${jobId} completed; hydrating extracted data`);
          // Sanitize extracted data to ensure all fields have defined values
          const sanitized = sanitizeImportData(job.extracted);
          // Merge with source documents (keep existing source docs, don't lose them)
          const mergedDocuments = [...sourceDocuments];
          // Add any extracted documents that aren't already in the source list
          for (const doc of sanitized.documents) {
            if (!mergedDocuments.find(d => d.fileName === doc.fileName)) {
              mergedDocuments.push(doc);
            }
          }
          setData((prev) => {
            if (prev && prev.general?.artist) {
              if ((!prev.warnings || prev.warnings.length === 0) && sanitized.warnings && sanitized.warnings.length > 0) {
                return { ...prev, warnings: sanitized.warnings };
              }
              return prev; // Already hydrated
            }
            return {
              ...sanitized,
              documents: mergedDocuments,
            };
          });
          clearInterval(interval);
        }

        if (job.status === "failed") {
          console.warn(`[import-ui] Job ${jobId} failed`, job.error);
          clearInterval(interval);
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, jobStatus]);

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
          {data.warnings && data.warnings.length > 0 && (
            <div className="rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              {data.warnings[0]?.message || "Some documents had very little readable text. Please review and complete missing fields manually."}
            </div>
          )}
          {(jobStatus === "pending" || jobStatus === "processing") && (
            <div className="p-4 rounded-lg border border-border bg-muted/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm">
                  <p className="font-medium">Processing import...</p>
                  {rawSources && rawSources.length > 0 ? (
                    <div className="text-muted-foreground text-xs space-y-1">
                      <p>Sources: {rawSources.map((s) => s.fileName).join(", ")}</p>
                      {progressData.current_section && (
                        <div className="space-y-0.5">
                          <p>
                            Processing <span className="font-semibold">{progressData.current_section}</span>
                            {progressData.sections_completed !== undefined && progressData.total_sections && (
                              <span className="ml-2 text-[11px] opacity-70">
                                (section {progressData.sections_completed + 1}/{progressData.total_sections})
                              </span>
                            )}
                          </p>
                          {progressData.current_source && (
                            <p className="text-primary text-[11px]">
                              → {progressData.current_source}
                              {progressData.current_chunk && progressData.total_chunks && progressData.total_chunks > 1 && (
                                <span className="ml-2 opacity-70">
                                  (chunk {progressData.current_chunk}/{progressData.total_chunks})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      You can keep editing or exit. We'll load extracted data once it's ready.
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Exit
              </Button>
            </div>
          )}

          <GeneralSection
            data={data.general}
            onChange={updateGeneral}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <DealSection
            data={data.deal}
            onChange={updateDeal}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <HotelSection
            data={data.hotels}
            onChange={updateHotels}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <FoodSection
            data={data.food}
            onChange={updateFood}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <FlightsSection
            data={data.flights}
            onChange={updateFlights}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <ActivitiesSection
            data={data.activities}
            onChange={updateActivities}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <DocumentsSection
            data={data.documents}
            onChange={updateDocuments}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <ContactsSection
            data={data.contacts}
            onChange={updateContacts}
            confidenceForField={confidenceLookup}
          />
          
          <div className="h-px bg-border" />
          
          <TechnicalSection
            data={data.technical}
            onChange={updateTechnical}
            confidenceForField={confidenceLookup}
          />
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
