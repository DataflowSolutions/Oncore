"use client";

import { FormField } from "../FormField";
import { FormTextarea } from "../FormTextarea";
import { SectionContainer } from "../SectionContainer";
import type { ImportedDeal } from "../types";

interface DealSectionProps {
  data: ImportedDeal;
  onChange: (data: ImportedDeal) => void;
}

/**
 * Deal section of the import confirmation form
 * Fields: Fee, Payment Terms, Deal Type, Currency, Notes
 */
export function DealSection({ data, onChange }: DealSectionProps) {
  const updateField = <K extends keyof ImportedDeal>(
    field: K,
    value: ImportedDeal[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <SectionContainer title="Deal">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1: Fee, Payment terms, Notes */}
        <FormField
          label="Fee"
          value={data.fee}
          onChange={(v) => updateField("fee", v)}
          placeholder="Enter fee amount"
        />
        <FormField
          label="Payment terms"
          value={data.paymentTerms}
          onChange={(v) => updateField("paymentTerms", v)}
          placeholder="e.g., 50% upfront"
        />
        <FormTextarea
          label="Notes"
          value={data.notes}
          onChange={(v) => updateField("notes", v)}
          placeholder="Additional deal notes..."
          rows={3}
          className="md:row-span-2"
        />

        {/* Row 2: Deal type, Currency */}
        <FormField
          label="Deal type"
          value={data.dealType}
          onChange={(v) => updateField("dealType", v)}
          placeholder="e.g., Flat fee, Guarantee"
        />
        <FormField
          label="Currency"
          value={data.currency}
          onChange={(v) => updateField("currency", v)}
          placeholder="e.g., USD, EUR"
        />
      </div>
    </SectionContainer>
  );
}
