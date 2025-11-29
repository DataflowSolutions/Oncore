"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { SectionContainer } from "../SectionContainer";
import { Button } from "@/components/ui/button";
import type { ImportedFood } from "../types";
import { createEmptyFood } from "../types";

interface FoodSectionProps {
  data: ImportedFood[];
  onChange: (data: ImportedFood[]) => void;
}

/**
 * Food/Catering section of the import confirmation form
 * Multi-item section with navigation arrows
 * Fields: Name, Address, City, Country, Booking reference, Phone, Email, Notes
 */
export function FoodSection({ data, onChange }: FoodSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-add first item if empty
  useEffect(() => {
    if (data.length === 0) {
      onChange([createEmptyFood()]);
    }
  }, []);

  // Handle empty data during initial render
  const currentFood = data[currentIndex] || null;

  const updateField = <K extends keyof ImportedFood>(
    field: K,
    value: ImportedFood[K]
  ) => {
    if (!currentFood) return;
    const updated = [...data];
    updated[currentIndex] = { ...currentFood, [field]: value };
    onChange(updated);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(data.length - 1, prev + 1));
  };

  const handleAdd = () => {
    onChange([...data, createEmptyFood()]);
    setCurrentIndex(data.length);
  };

  const handleRemove = () => {
    if (data.length <= 1) return;
    const updated = data.filter((_, i) => i !== currentIndex);
    onChange(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  if (!currentFood) {
    return (
      <SectionContainer title="Food">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer
      title="Food"
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
          value={currentFood.name}
          onChange={(v) => updateField("name", v)}
          placeholder="Provider name"
        />
        <FormField
          label="Address"
          value={currentFood.address}
          onChange={(v) => updateField("address", v)}
          placeholder="Street address"
        />
        <FormField
          label="City"
          value={currentFood.city}
          onChange={(v) => updateField("city", v)}
          placeholder="City"
        />

        {/* Row 2: Booking reference, Phone, Country */}
        <FormField
          label="Booking reference"
          value={currentFood.bookingReference}
          onChange={(v) => updateField("bookingReference", v)}
          placeholder="Booking reference"
        />
        <FormField
          label="Phone"
          value={currentFood.phone}
          onChange={(v) => updateField("phone", v)}
          type="tel"
          placeholder="Phone number"
        />
        <FormField
          label="Country"
          value={currentFood.country}
          onChange={(v) => updateField("country", v)}
          placeholder="Country"
        />

        {/* Row 3: Notes, Email, Actions */}
        <FormField
          label="Notes"
          value={currentFood.notes}
          onChange={(v) => updateField("notes", v)}
          placeholder="Additional notes"
        />
        <FormField
          label="Email"
          value={currentFood.email}
          onChange={(v) => updateField("email", v)}
          type="email"
          placeholder="Email address"
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
            Add Food
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
