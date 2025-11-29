"use client";

import { FormField } from "../FormField";
import { SectionContainer } from "../SectionContainer";
import type { ImportedGeneral } from "../types";

interface GeneralSectionProps {
  data: ImportedGeneral;
  onChange: (data: ImportedGeneral) => void;
}

/**
 * General section of the import confirmation form
 * Fields: Artist, Event Name, Venue, Date, Set Time, City, Country
 */
export function GeneralSection({ data, onChange }: GeneralSectionProps) {
  const updateField = <K extends keyof ImportedGeneral>(
    field: K,
    value: ImportedGeneral[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <SectionContainer title="General">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Artist, Event Name, Venue */}
        <FormField
          label="Artist"
          value={data.artist}
          onChange={(v) => updateField("artist", v)}
          placeholder="Enter artist name"
        />
        <FormField
          label="Event Name"
          value={data.eventName}
          onChange={(v) => updateField("eventName", v)}
          placeholder="Enter event name"
        />
        <FormField
          label="Venue"
          value={data.venue}
          onChange={(v) => updateField("venue", v)}
          placeholder="Enter venue name"
        />

        {/* Row 2: Date, Set time, City, Country */}
        <div className="flex gap-4">
          <FormField
            label="Date"
            value={data.date}
            onChange={(v) => updateField("date", v)}
            type="date"
            className="flex-1"
          />
          <FormField
            label="Set time"
            value={data.setTime}
            onChange={(v) => updateField("setTime", v)}
            type="time"
            className="w-24"
          />
        </div>
        <FormField
          label="City"
          value={data.city}
          onChange={(v) => updateField("city", v)}
          placeholder="Enter city"
        />
        <FormField
          label="Country"
          value={data.country}
          onChange={(v) => updateField("country", v)}
          placeholder="Enter country"
        />
      </div>
    </SectionContainer>
  );
}
