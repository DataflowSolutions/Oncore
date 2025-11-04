"use client";

import { Plane, PlaneLanding } from "lucide-react";

interface FlightsPanelProps {
  selectedPeopleIds: string[];
  advancingData?: {
    arrivalFlights: Array<{
      personId: string;
      time?: string;
      flightNumber?: string;
      from?: string;
      to?: string;
    }>;
    departureFlights: Array<{
      personId: string;
      time?: string;
      flightNumber?: string;
      from?: string;
      to?: string;
    }>;
  };
  currentDateStr: string;
  getLocalDateStr: (date: Date) => string;
}

export function FlightsPanel({
  selectedPeopleIds,
  advancingData,
  currentDateStr,
  getLocalDateStr,
}: FlightsPanelProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {/* <Plane className="w-4 h-4 text-cyan-400" /> */}
        Flights
      </h3>

      {advancingData && selectedPeopleIds.length > 0 ? (
        <div className="space-y-3">
          {selectedPeopleIds.map((personId) => {
            const arrival = advancingData.arrivalFlights.find(
              (f) => f.personId === personId
            );
            const departure = advancingData.departureFlights.find(
              (f) => f.personId === personId
            );

            const arrivalOnCurrentDate =
              arrival?.time &&
              getLocalDateStr(new Date(arrival.time)) === currentDateStr;
            const departureOnCurrentDate =
              departure?.time &&
              getLocalDateStr(new Date(departure.time)) === currentDateStr;

            if (!arrivalOnCurrentDate && !departureOnCurrentDate) return null;

            return (
              <div key={personId} className="space-y-2">
                {arrivalOnCurrentDate && arrival?.time && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <PlaneLanding className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-emerald-300 mb-1">
                          Arrival: {arrival.flightNumber || "Flight"}
                        </div>
                        <div className="text-sm text-neutral-300">
                          {arrival.from || "Unknown"} →{" "}
                          {arrival.to || "Unknown"}
                        </div>
                        <div className="text-sm text-neutral-400 mt-1">
                          {new Date(arrival.time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {departureOnCurrentDate && departure?.time && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Plane className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-blue-300 mb-1">
                          Return: {departure.flightNumber || "Flight"}
                        </div>
                        <div className="text-sm text-neutral-300">
                          {departure.from || "Unknown"} →{" "}
                          {departure.to || "Unknown"}
                        </div>
                        <div className="text-sm text-neutral-400 mt-1">
                          {new Date(departure.time).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <p className="text-sm text-neutral-400">
            {selectedPeopleIds.length === 0
              ? "Select people above to view flight information"
              : "No flights scheduled for this date"}
          </p>
        </div>
      )}
    </div>
  );
}
