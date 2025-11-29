"use client";

import { FormField } from "../FormField";
import { SectionContainer } from "../SectionContainer";
import type { ImportedGeneral } from "../types";

type ConfidenceLookup = (path: string) => number | undefined;

interface GeneralSectionProps {
  data: ImportedGeneral;
  onChange: (data: ImportedGeneral) => void;
  confidenceForField?: ConfidenceLookup;
}

/**
 * General section of the import confirmation form
 * Fields: Artist, Event Name, Venue, Date, Set Time, City, Country
 */
export function GeneralSection({ data, onChange, confidenceForField }: GeneralSectionProps) {
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
          confidence={confidenceForField?.("general.artist")}
        />
        <FormField
          label="Event Name"
          value={data.eventName}
          onChange={(v) => updateField("eventName", v)}
          placeholder="Enter event name"
          confidence={confidenceForField?.("general.eventName")}
        />
        <FormField
          label="Venue"
          value={data.venue}
          onChange={(v) => updateField("venue", v)}
          placeholder="Enter venue name"
          confidence={confidenceForField?.("general.venue")}
        />

        {/* Row 2: Date, Set time, City, Country */}
        <div className="flex gap-4">
          <FormField
          label="Date"
          value={data.date}
          onChange={(v) => updateField("date", v)}
          type="date"
          className="flex-1"
          confidence={confidenceForField?.("general.date")}
        />
        <FormField
          label="Set time"
          value={data.setTime}
          onChange={(v) => updateField("setTime", v)}
          type="time"
          className="w-24"
          confidence={confidenceForField?.("general.setTime")}
        />
        </div>
        <FormField
          label="City"
          value={data.city}
          onChange={(v) => updateField("city", v)}
          placeholder="Enter city"
          confidence={confidenceForField?.("general.city")}
        />
        <FormField
          label="Country"
          value={data.country}
          onChange={(v) => updateField("country", v)}
          placeholder="Enter country"
          confidence={confidenceForField?.("general.country")}
        />
      </div>
    </SectionContainer>
  );
}
