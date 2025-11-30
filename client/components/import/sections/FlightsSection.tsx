"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { SectionContainer } from "../SectionContainer";
import { Button } from "@/components/ui/button";
import type { ImportedFlight } from "../types";
import { createEmptyFlight } from "../types";

type ConfidenceLookup = (path: string) => number | undefined;

interface FlightsSectionProps {
  data: ImportedFlight[];
  onChange: (data: ImportedFlight[]) => void;
  confidenceForField?: ConfidenceLookup;
}

/**
 * Flights section of the import confirmation form
 * Multi-item section with navigation arrows
 * Fields: Airline, Flight number, Aircraft, Full name, Booking ref, Ticket number,
 *         From city/airport, Departure time, To city/airport, Arrival time,
 *         Seat, Class, Flight time
 */
export function FlightsSection({ data, onChange, confidenceForField }: FlightsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-add first item if empty (only once on mount)
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      if (data.length === 0) {
        onChange([createEmptyFlight()]);
      }
    }
  }, [isInitialized, data.length, onChange]);

  // Handle empty data - show empty state with add button, not "Loading..."
  const currentFlight = data[currentIndex] || null;

  const updateField = <K extends keyof ImportedFlight>(
    field: K,
    value: ImportedFlight[K]
  ) => {
    if (!currentFlight) return;
    const updated = [...data];
    updated[currentIndex] = { ...currentFlight, [field]: value };
    onChange(updated);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(data.length - 1, prev + 1));
  };

  const handleAdd = () => {
    onChange([...data, createEmptyFlight()]);
    setCurrentIndex(data.length);
  };

  const handleRemove = () => {
    if (data.length <= 1) return;
    const updated = data.filter((_, i) => i !== currentIndex);
    onChange(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  if (!currentFlight) {
    return (
      <SectionContainer title="Flights">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-muted-foreground text-sm">No flights yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([createEmptyFlight()])}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Flight
          </Button>
        </div>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer
      title="Flights"
      showNavigation
      currentIndex={currentIndex}
      totalItems={data.length}
      onPrevious={handlePrevious}
      onNext={handleNext}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Airline, Flight number, Aircraft */}
        <FormField
          label="Airline"
          value={currentFlight.airline}
          onChange={(v) => updateField("airline", v)}
          placeholder="Airline name"
          confidence={confidenceForField?.(`flights[${currentIndex}].airline`)}
        />
        <FormField
          label="Flight number"
          value={currentFlight.flightNumber}
          onChange={(v) => updateField("flightNumber", v)}
          placeholder="e.g., SK1234"
          confidence={confidenceForField?.(`flights[${currentIndex}].flightNumber`)}
        />
        <FormField
          label="Aircraft"
          value={currentFlight.aircraft}
          onChange={(v) => updateField("aircraft", v)}
          placeholder="Aircraft model"
          confidence={confidenceForField?.(`flights[${currentIndex}].aircraft`)}
        />

        {/* Row 2: Full Name, Booking reference, Ticket number */}
        <FormField
          label="Full Name"
          value={currentFlight.fullName}
          onChange={(v) => updateField("fullName", v)}
          placeholder="Passenger name"
          confidence={confidenceForField?.(`flights[${currentIndex}].fullName`)}
        />
        <FormField
          label="Booking reference"
          value={currentFlight.bookingReference}
          onChange={(v) => updateField("bookingReference", v)}
          placeholder="Booking reference"
          confidence={confidenceForField?.(`flights[${currentIndex}].bookingReference`)}
        />
        <FormField
          label="Ticket number"
          value={currentFlight.ticketNumber}
          onChange={(v) => updateField("ticketNumber", v)}
          placeholder="Ticket number"
          confidence={confidenceForField?.(`flights[${currentIndex}].ticketNumber`)}
        />

        {/* Row 3: From city, From Airport, Departure time */}
        <FormField
          label="From city"
          value={currentFlight.fromCity}
          onChange={(v) => updateField("fromCity", v)}
          placeholder="Departure city"
          confidence={confidenceForField?.(`flights[${currentIndex}].fromCity`)}
        />
        <FormField
          label="From Airport"
          value={currentFlight.fromAirport}
          onChange={(v) => updateField("fromAirport", v)}
          placeholder="e.g., LAX"
          confidence={confidenceForField?.(`flights[${currentIndex}].fromAirport`)}
        />
        <FormField
          label="Departure time"
          value={currentFlight.departureTime}
          onChange={(v) => updateField("departureTime", v)}
          placeholder="e.g., 14:30"
          confidence={confidenceForField?.(`flights[${currentIndex}].departureTime`)}
        />

        {/* Row 4: To city, To Airport, Arrival time */}
        <FormField
          label="To city"
          value={currentFlight.toCity}
          onChange={(v) => updateField("toCity", v)}
          placeholder="Arrival city"
          confidence={confidenceForField?.(`flights[${currentIndex}].toCity`)}
        />
        <FormField
          label="To Airport"
          value={currentFlight.toAirport}
          onChange={(v) => updateField("toAirport", v)}
          placeholder="e.g., JFK"
          confidence={confidenceForField?.(`flights[${currentIndex}].toAirport`)}
        />
        <FormField
          label="Arrival time"
          value={currentFlight.arrivalTime}
          onChange={(v) => updateField("arrivalTime", v)}
          placeholder="e.g., 22:15"
          confidence={confidenceForField?.(`flights[${currentIndex}].arrivalTime`)}
        />

        {/* Row 5: Seat, Class, Flight time */}
        <FormField
          label="Seat"
          value={currentFlight.seat}
          onChange={(v) => updateField("seat", v)}
          placeholder="e.g., 12A"
          confidence={confidenceForField?.(`flights[${currentIndex}].seat`)}
        />
        <FormField
          label="Class"
          value={currentFlight.travelClass}
          onChange={(v) => updateField("travelClass", v)}
          placeholder="e.g., Economy, Business"
          confidence={confidenceForField?.(`flights[${currentIndex}].travelClass`)}
        />
        <FormField
          label="Flight time"
          value={currentFlight.flightTime}
          onChange={(v) => updateField("flightTime", v)}
          placeholder="e.g., 5h 30m"
          confidence={confidenceForField?.(`flights[${currentIndex}].flightTime`)}
        />

        {/* Actions */}
        <div className="md:col-span-3 flex gap-2 justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Flight
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
