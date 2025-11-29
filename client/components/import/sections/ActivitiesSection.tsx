"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { FormTextarea } from "../FormTextarea";
import { SectionContainer } from "../SectionContainer";
import { Button } from "@/components/ui/button";
import type { ImportedActivity } from "../types";
import { createEmptyActivity } from "../types";

type ConfidenceLookup = (path: string) => number | undefined;

interface ActivitiesSectionProps {
  data: ImportedActivity[];
  onChange: (data: ImportedActivity[]) => void;
  confidenceForField?: ConfidenceLookup;
}

/**
 * Activities & Transfers section of the import confirmation form
 * Multi-item section with navigation arrows
 * Each activity can have an optional destination (for transfers)
 * Fields: Name, Location, Start Time, End Time, Notes
 *         + Optional destination: Name, Location
 */
export function ActivitiesSection({ data, onChange, confidenceForField }: ActivitiesSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-add first item if empty
  useEffect(() => {
    if (data.length === 0) {
      onChange([createEmptyActivity()]);
    }
  }, []);

  // Handle empty data during initial render
  const currentActivity = data[currentIndex] || null;

  const updateField = <K extends keyof ImportedActivity>(
    field: K,
    value: ImportedActivity[K]
  ) => {
    if (!currentActivity) return;
    const updated = [...data];
    updated[currentIndex] = { ...currentActivity, [field]: value };
    onChange(updated);
  };

  const toggleDestination = () => {
    if (!currentActivity) return;
    const updated = [...data];
    updated[currentIndex] = {
      ...currentActivity,
      hasDestination: !currentActivity.hasDestination,
      destinationName: currentActivity.hasDestination ? "" : currentActivity.destinationName,
      destinationLocation: currentActivity.hasDestination ? "" : currentActivity.destinationLocation,
    };
    onChange(updated);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(data.length - 1, prev + 1));
  };

  const handleAdd = () => {
    onChange([...data, createEmptyActivity()]);
    setCurrentIndex(data.length);
  };

  const handleRemove = () => {
    if (data.length <= 1) return;
    const updated = data.filter((_, i) => i !== currentIndex);
    onChange(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  if (!currentActivity) {
    return (
      <SectionContainer title="Activities & Transfers">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer
      title="Activities & Transfers"
      showNavigation
      currentIndex={currentIndex}
      totalItems={data.length}
      onPrevious={handlePrevious}
      onNext={handleNext}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Row 1: Name, Location, Start Time, Notes */}
        <FormField
          label="Name"
          value={currentActivity.name}
          onChange={(v) => updateField("name", v)}
          placeholder="Activity name"
          confidence={confidenceForField?.(`activities[${currentIndex}].name`)}
        />
        <FormField
          label="Location"
          value={currentActivity.location}
          onChange={(v) => updateField("location", v)}
          placeholder="Location/address"
          confidence={confidenceForField?.(`activities[${currentIndex}].location`)}
        />
        <FormField
          label="Start Time"
          value={currentActivity.startTime}
          onChange={(v) => updateField("startTime", v)}
          type="time"
          confidence={confidenceForField?.(`activities[${currentIndex}].startTime`)}
        />
        <FormTextarea
          label="Notes"
          value={currentActivity.notes}
          onChange={(v) => updateField("notes", v)}
          placeholder="Additional notes..."
          rows={3}
          className="md:row-span-2"
          confidence={confidenceForField?.(`activities[${currentIndex}].notes`)}
        />

        {/* Row 2: Destination toggle and fields */}
        <div className="md:col-span-3 flex items-center gap-4">
          <button
            type="button"
            onClick={toggleDestination}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <span>Going somewhere? Add destination</span>
            {currentActivity.hasDestination && (
              <X className="w-4 h-4 text-destructive" />
            )}
          </button>
        </div>

        {/* Destination fields (shown when hasDestination is true) */}
        {currentActivity.hasDestination && (
          <>
            <FormField
              label="Name"
              value={currentActivity.destinationName || ""}
              onChange={(v) => updateField("destinationName", v)}
              placeholder="Destination name"
              confidence={confidenceForField?.(`activities[${currentIndex}].destinationName`)}
            />
            <FormField
              label="Location"
              value={currentActivity.destinationLocation || ""}
              onChange={(v) => updateField("destinationLocation", v)}
              placeholder="Destination address"
              confidence={confidenceForField?.(`activities[${currentIndex}].destinationLocation`)}
            />
            <FormField
              label="End Time"
              value={currentActivity.endTime}
              onChange={(v) => updateField("endTime", v)}
              type="time"
              confidence={confidenceForField?.(`activities[${currentIndex}].endTime`)}
            />
          </>
        )}

        {/* Actions */}
        <div className="md:col-span-4 flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </Button>
          {data.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </SectionContainer>
  );
}
