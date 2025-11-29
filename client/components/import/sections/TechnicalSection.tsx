"use client";

import { FormTextarea } from "../FormTextarea";
import { SectionContainer } from "../SectionContainer";
import type { ImportedTechnical } from "../types";

type ConfidenceLookup = (path: string) => number | undefined;

interface TechnicalSectionProps {
  data: ImportedTechnical;
  onChange: (data: ImportedTechnical) => void;
  confidenceForField?: ConfidenceLookup;
}

/**
 * Technical section of the import confirmation form
 * Fields: Equipment, Backline, Stage Setup, Lighting requirements, Soundcheck, Other
 * All fields are textarea for longer text content
 */
export function TechnicalSection({ data, onChange, confidenceForField }: TechnicalSectionProps) {
  const updateField = <K extends keyof ImportedTechnical>(
    field: K,
    value: ImportedTechnical[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <SectionContainer title="Technical">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Equipment, Backline, Stage Setup */}
        <FormTextarea
          label="Equipment"
          value={data.equipment}
          onChange={(v) => updateField("equipment", v)}
          placeholder="Required equipment..."
          rows={4}
          confidence={confidenceForField?.("technical.equipment")}
        />
        <FormTextarea
          label="Backline"
          value={data.backline}
          onChange={(v) => updateField("backline", v)}
          placeholder="Backline requirements..."
          rows={4}
          confidence={confidenceForField?.("technical.backline")}
        />
        <FormTextarea
          label="Stage Setup"
          value={data.stageSetup}
          onChange={(v) => updateField("stageSetup", v)}
          placeholder="Stage setup details..."
          rows={4}
          confidence={confidenceForField?.("technical.stageSetup")}
        />

        {/* Row 2: Lighting requirements, Soundcheck, Other */}
        <FormTextarea
          label="Lighting requirements"
          value={data.lightingRequirements}
          onChange={(v) => updateField("lightingRequirements", v)}
          placeholder="Lighting requirements..."
          rows={4}
          confidence={confidenceForField?.("technical.lightingRequirements")}
        />
        <FormTextarea
          label="Soundcheck"
          value={data.soundcheck}
          onChange={(v) => updateField("soundcheck", v)}
          placeholder="Soundcheck details..."
          rows={4}
          confidence={confidenceForField?.("technical.soundcheck")}
        />
        <FormTextarea
          label="Other"
          value={data.other}
          onChange={(v) => updateField("other", v)}
          placeholder="Other technical notes..."
          rows={4}
          confidence={confidenceForField?.("technical.other")}
        />
      </div>
    </SectionContainer>
  );
}
