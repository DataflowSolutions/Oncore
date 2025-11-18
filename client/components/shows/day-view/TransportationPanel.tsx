"use client";

import { Clock, MapPin } from "lucide-react";

interface TransportationPanelProps {
  advancingFields: Array<{ field_name: string; value: unknown }>;
  assignedPeople: Array<{
    person_id: string;
    duty: string | null;
    people: {
      id: string;
      name: string;
      member_type: string | null;
    } | null;
  }>;
}

export function TransportationPanel({
  advancingFields,
  assignedPeople,
}: TransportationPanelProps) {
  // Check for promoter transfers (JSON array)
  const promoterTransfersField = advancingFields.find(
    (f) => f.field_name === "promoter_transfers"
  )?.value;
  let promoterTransfers: Array<{
    id: string;
    from: string;
    fromTime: string;
    to: string;
    toTime: string;
  }> = [];

  if (promoterTransfersField) {
    try {
      // Value is already a JSON object from JSONB, no need to parse
      if (typeof promoterTransfersField === "string") {
        promoterTransfers = JSON.parse(promoterTransfersField);
      } else if (Array.isArray(promoterTransfersField)) {
        promoterTransfers = promoterTransfersField as Array<{
          id: string;
          from: string;
          fromTime: string;
          to: string;
          toTime: string;
        }>;
      }
      // Filter out empty transfers
      promoterTransfers = promoterTransfers.filter(
        (t) => t.from || t.to || t.fromTime || t.toTime
      );
    } catch {
      promoterTransfers = [];
    }
  }

  // Extract transportation information for assigned people (artist-specific)
  const transportData = assignedPeople
    .map((person) => {
      if (!person.people) return null;

      const personId = person.person_id;
      const time = advancingFields.find(
        (f) => f.field_name === `transportation_${personId}_time`
      )?.value as string | undefined;
      const from = advancingFields.find(
        (f) => f.field_name === `transportation_${personId}_from`
      )?.value as string | undefined;
      const to = advancingFields.find(
        (f) => f.field_name === `transportation_${personId}_to`
      )?.value as string | undefined;
      const notes = advancingFields.find(
        (f) => f.field_name === `transportation_${personId}_notes`
      )?.value as string | undefined;

      if (!time && !from && !to) return null;

      return {
        personName: person.people.name,
        time,
        from,
        to,
        notes,
      };
    })
    .filter(Boolean);

  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <h3 className="text-xl font-medium text-card-foreground font-header mb-4">
        Transportation
      </h3>

      {transportData.length === 0 && promoterTransfers.length === 0 ? (
        <div>
          <p className="text-sm text-neutral-400">
            No transportation scheduled
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Ground transportation will be shown here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Show promoter transfers */}
          {promoterTransfers.map((transfer, idx) => (
            <div
              key={`promoter-${transfer.id}`}
              className="bg-card-cell rounded-lg p-4"
            >
              <div className="font-medium text-sm mb-2">Transfer {idx + 1}</div>
              <div className="space-y-1">
                {(transfer.from || transfer.fromTime) && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <MapPin className="w-3 h-3" />
                    <span>From: {transfer.from || "TBD"}</span>
                    {transfer.fromTime && (
                      <>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{transfer.fromTime}</span>
                      </>
                    )}
                  </div>
                )}
                {(transfer.to || transfer.toTime) && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <MapPin className="w-3 h-3" />
                    <span>To: {transfer.to || "TBD"}</span>
                    {transfer.toTime && (
                      <>
                        <Clock className="w-3 h-3 ml-2" />
                        <span>{transfer.toTime}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Show per-person transport data */}
          {transportData.map((transport, idx) => (
            <div key={idx} className="bg-neutral-800/50 rounded-lg p-4">
              <div className="font-medium text-sm mb-2">
                {transport!.personName}
              </div>
              {transport!.time && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                  <Clock className="w-3 h-3" />
                  <span>{transport!.time}</span>
                </div>
              )}
              {(transport!.from || transport!.to) && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {transport!.from && <span>{transport!.from}</span>}
                    {transport!.from && transport!.to && (
                      <span className="mx-1">→</span>
                    )}
                    {transport!.to && <span>{transport!.to}</span>}
                  </span>
                </div>
              )}
              {transport!.notes && (
                <div className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-700">
                  {transport!.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
