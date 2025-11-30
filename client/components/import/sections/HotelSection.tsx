"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { FormTextarea } from "../FormTextarea";
import { SectionContainer } from "../SectionContainer";
import { Button } from "@/components/ui/button";
import type { ImportedHotel } from "../types";
import { createEmptyHotel } from "../types";

type ConfidenceLookup = (path: string) => number | undefined;

interface HotelSectionProps {
  data: ImportedHotel[];
  onChange: (data: ImportedHotel[]) => void;
  confidenceForField?: ConfidenceLookup;
}

/**
 * Hotel section of the import confirmation form
 * Multi-item section with navigation arrows
 * Fields: Name, Address, City, Country, Check-in date/time, Check-out date/time, 
 *         Booking reference, Phone, Email, Notes
 */
export function HotelSection({ data, onChange, confidenceForField }: HotelSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-add first item if empty (only once on mount)
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      if (data.length === 0) {
        onChange([createEmptyHotel()]);
      }
    }
  }, [isInitialized, data.length, onChange]);

  // Handle empty data - show empty state with add button, not "Loading..."
  const currentHotel = data[currentIndex] || null;

  const updateField = <K extends keyof ImportedHotel>(
    field: K,
    value: ImportedHotel[K]
  ) => {
    if (!currentHotel) return;
    const updated = [...data];
    updated[currentIndex] = { ...currentHotel, [field]: value };
    onChange(updated);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(data.length - 1, prev + 1));
  };

  const handleAdd = () => {
    onChange([...data, createEmptyHotel()]);
    setCurrentIndex(data.length);
  };

  const handleRemove = () => {
    if (data.length <= 1) return;
    const updated = data.filter((_, i) => i !== currentIndex);
    onChange(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  if (!currentHotel) {
    return (
      <SectionContainer title="Hotel">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-muted-foreground text-sm">No hotel bookings yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([createEmptyHotel()])}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Hotel
          </Button>
        </div>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer
      title="Hotel"
      showNavigation
      currentIndex={currentIndex}
      totalItems={data.length}
      onPrevious={handlePrevious}
      onNext={handleNext}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Name, Address, City */}
        <FormField
          label="Name"
          value={currentHotel.name}
          onChange={(v) => updateField("name", v)}
          placeholder="Hotel name"
          confidence={confidenceForField?.(`hotels[${currentIndex}].name`)}
        />
        <FormField
          label="Address"
          value={currentHotel.address}
          onChange={(v) => updateField("address", v)}
          placeholder="Street address"
          confidence={confidenceForField?.(`hotels[${currentIndex}].address`)}
        />
        <FormField
          label="City"
          value={currentHotel.city}
          onChange={(v) => updateField("city", v)}
          placeholder="City"
          confidence={confidenceForField?.(`hotels[${currentIndex}].city`)}
        />

        {/* Row 2: Check-in date/time, Check-out date/time, Country */}
        <div className="flex gap-4">
          <FormField
            label="Check in date"
            value={currentHotel.checkInDate}
            onChange={(v) => updateField("checkInDate", v)}
            type="date"
            className="flex-1"
            confidence={confidenceForField?.(`hotels[${currentIndex}].checkInDate`)}
          />
          <FormField
            label="Time"
            value={currentHotel.checkInTime}
            onChange={(v) => updateField("checkInTime", v)}
            type="time"
            className="w-24"
            confidence={confidenceForField?.(`hotels[${currentIndex}].checkInTime`)}
          />
        </div>
        <div className="flex gap-4">
          <FormField
            label="Check out date"
            value={currentHotel.checkOutDate}
            onChange={(v) => updateField("checkOutDate", v)}
            type="date"
            className="flex-1"
            confidence={confidenceForField?.(`hotels[${currentIndex}].checkOutDate`)}
          />
          <FormField
            label="Time"
            value={currentHotel.checkOutTime}
            onChange={(v) => updateField("checkOutTime", v)}
            type="time"
            className="w-24"
            confidence={confidenceForField?.(`hotels[${currentIndex}].checkOutTime`)}
          />
        </div>
        <FormField
          label="Country"
          value={currentHotel.country}
          onChange={(v) => updateField("country", v)}
          placeholder="Country"
          confidence={confidenceForField?.(`hotels[${currentIndex}].country`)}
        />

        {/* Row 3: Booking reference, Phone, Email */}
        <FormField
          label="Booking reference"
          value={currentHotel.bookingReference}
          onChange={(v) => updateField("bookingReference", v)}
          placeholder="Booking reference"
          confidence={confidenceForField?.(`hotels[${currentIndex}].bookingReference`)}
        />
        <FormField
          label="Phone"
          value={currentHotel.phone}
          onChange={(v) => updateField("phone", v)}
          type="tel"
          placeholder="Phone number"
          confidence={confidenceForField?.(`hotels[${currentIndex}].phone`)}
        />
        <FormField
          label="Email"
          value={currentHotel.email}
          onChange={(v) => updateField("email", v)}
          type="email"
          placeholder="Email address"
          confidence={confidenceForField?.(`hotels[${currentIndex}].email`)}
        />

        {/* Row 4: Notes (full width) */}
        <FormTextarea
          label="Notes"
          value={currentHotel.notes}
          onChange={(v) => updateField("notes", v)}
          placeholder="Additional notes..."
          rows={3}
          className="md:col-span-2"
          confidence={confidenceForField?.(`hotels[${currentIndex}].notes`)}
        />

        {/* Actions */}
        <div className="flex flex-col gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Hotel
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
