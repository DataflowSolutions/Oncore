"use client";

import { Clock } from "lucide-react";

interface CateringPanelProps {
  advancingFields: Array<{ field_name: string; value: unknown }>;
}

export function CateringPanel({ advancingFields }: CateringPanelProps) {
  // Extract catering information - check both artist and promoter field names
  const company =
    (advancingFields.find((f) => f.field_name === "catering_company")?.value as
      | string
      | undefined) ||
    (advancingFields.find((f) => f.field_name === "promoter_catering")
      ?.value as string | undefined);
  const serviceTime = advancingFields.find(
    (f) => f.field_name === "catering_serviceTime"
  )?.value as string | undefined;
  const menuNotes = advancingFields.find(
    (f) => f.field_name === "catering_menu"
  )?.value as string | undefined;
  const guestCount = advancingFields.find(
    (f) => f.field_name === "catering_guestCount"
  )?.value as string | number | undefined;

  // If we have promoter catering text, use it as general info
  const promoterCateringInfo = advancingFields.find(
    (f) => f.field_name === "promoter_catering"
  )?.value as string | undefined;

  if (
    !company &&
    !serviceTime &&
    !menuNotes &&
    !guestCount &&
    !promoterCateringInfo
  ) {
    return (
      <div className="bg-card border border-neutral-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">Catering</h3>
        <div className="bg-card-cell rounded-lg p-4">
          <p className="text-sm text-neutral-400">
            No catering information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Catering details will be shown here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">Catering</h3>
      <div className="bg-card-cell rounded-lg p-4 space-y-3">
        {promoterCateringInfo && (
          <div className="text-sm text-neutral-300 whitespace-pre-wrap">
            {promoterCateringInfo}
          </div>
        )}
        {company && !promoterCateringInfo && (
          <div>
            <div className="text-sm font-medium text-neutral-300">
              {company}
            </div>
          </div>
        )}
        {serviceTime && (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Clock className="w-3 h-3" />
            <span>Service time: {serviceTime}</span>
          </div>
        )}
        {guestCount && (
          <div className="text-sm text-neutral-400">
            Guest count: {guestCount}
          </div>
        )}
        {menuNotes && (
          <div className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-700">
            {menuNotes}
          </div>
        )}
      </div>
    </div>
  );
}
