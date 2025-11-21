"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdvancingField } from "@/lib/actions/advancing";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItemsForShow,
} from "@/lib/actions/schedule";
import { logger } from "@/lib/logger";

interface FlightsPanelProps {
  advancingFields: Array<{ field_name: string; value: unknown }>;
  orgSlug: string;
  showId: string;
}

export function FlightsPanel({
  advancingFields,
  orgSlug,
  showId,
}: FlightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [airlineName, setAirlineName] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [fullName, setFullName] = useState("");
  const [departureAirportCode, setDepartureAirportCode] = useState("");
  const [departureAirportCity, setDepartureAirportCity] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalAirportCode, setArrivalAirportCode] = useState("");
  const [arrivalAirportCity, setArrivalAirportCity] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [travelClass, setTravelClass] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Extract flight information from single JSON field
  const flightField = advancingFields.find((f) => f.field_name === "flight");

  const flightInfo = flightField?.value as
    | {
        airlineName?: string;
        flightNumber?: string;
        bookingRef?: string;
        ticketNumber?: string;
        aircraftModel?: string;
        fullName?: string;
        departureAirportCode?: string;
        departureAirportCity?: string;
        departureDateTime?: string;
        arrivalAirportCode?: string;
        arrivalAirportCity?: string;
        arrivalDateTime?: string;
        seatNumber?: string;
        travelClass?: string;
      }
    | undefined;
  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-medium text-card-foreground font-header">
          Flights
        </h3>
        <button
          onClick={() => setIsOpen(true)}
          className="text-button-bg hover:text-button-bg-hover cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {!flightInfo ? (
        <div>
          <p className="text-sm text-neutral-400">
            No flight information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Flight details will be shown here
          </p>
        </div>
      ) : (
        <div>
          <div
            className="cursor-pointer hover:opacity-50 transition-opacity flex flex-col gap-2"
            onClick={() => setIsDetailsOpen(true)}
          >
            {/* Departure and Arrival in two columns */}
            <div className="flex gap-4 justify-between items-center">
              {/* Departure */}
              {flightInfo.departureDateTime && (
                <div className="text-left flex items-center gap-2">
                  <div>
                    <div className="text-xs text-description-foreground">
                      {flightInfo.departureAirportCode || "Departure"}
                    </div>
                    <div className="font-header text-lg">
                      {new Date(
                        flightInfo.departureDateTime
                      ).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Arrow or divider */}
              {flightInfo.departureDateTime && flightInfo.arrivalDateTime && (
                <div className="text-description-foreground">→</div>
              )}

              {/* Arrival */}
              {flightInfo.arrivalDateTime && (
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="text-xs text-description-foreground">
                      {flightInfo.arrivalAirportCode || "Arrival"}
                    </div>
                    <div className="font-header text-lg">
                      {new Date(flightInfo.arrivalDateTime).toLocaleTimeString(
                        "en-GB",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Flight Number and Airline */}
            {(flightInfo.flightNumber || flightInfo.airlineName) && (
              <div className="text-center text-xs font-header text-card-foreground">
                {flightInfo.airlineName && flightInfo.flightNumber
                  ? `${flightInfo.airlineName} ${flightInfo.flightNumber}`
                  : flightInfo.flightNumber || flightInfo.airlineName}
              </div>
            )}
          </div>
        </div>
      )}
      <Popup
        title="Flights"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-[720px]"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            setIsSaving(true);

            try {
              // Save all flight data as a single JSON object
              const flightData = {
                airlineName,
                flightNumber,
                bookingRef,
                ticketNumber,
                aircraftModel,
                fullName,
                departureAirportCode,
                departureAirportCity,
                departureDateTime: departureTime,
                arrivalAirportCode,
                arrivalAirportCity,
                arrivalDateTime: arrivalTime,
                seatNumber,
                travelClass,
              };

              const result = await createAdvancingField(orgSlug, showId, {
                section: "flight",
                fieldName: "flight",
                fieldType: "json",
                partyType: "from_you",
                value: flightData,
              });

              if (!result.success) {
                logger.error("Failed to save flight data", {
                  error: result.error,
                });
                throw new Error(result.error || "Failed to save flight data");
              }

              const advancingFieldId = result.data?.id;

              // Delete existing auto-generated flight schedule items first
              const existingItems = await getScheduleItemsForShow(showId);
              const flightItems = existingItems.filter(
                (item) =>
                  (item.item_type === "departure" ||
                    item.item_type === "arrival") &&
                  item.auto_generated
              );

              for (const item of flightItems) {
                await deleteScheduleItem(orgSlug, showId, item.id);
              }

              // Create single schedule item for the flight (using departure time as primary)
              if (departureTime && arrivalTime) {
                // Ensure consistent ISO string handling - append seconds if not present
                const departureISO = departureTime.includes(":00:00")
                  ? departureTime
                  : `${departureTime}:00`;
                const arrivalISO = arrivalTime.includes(":00:00")
                  ? arrivalTime
                  : `${arrivalTime}:00`;

                const flightResult = await createScheduleItem(orgSlug, showId, {
                  title: `Flight ${flightNumber || ""} - ${
                    airlineName || "Flight"
                  }`,
                  starts_at: departureISO,
                  ends_at: arrivalISO,
                  location: `${departureAirportCode || "Departure"} → ${
                    arrivalAirportCode || "Arrival"
                  }`,
                  notes: `${
                    departureAirportCity ? `From ${departureAirportCity}` : ""
                  } ${
                    arrivalAirportCity ? `to ${arrivalAirportCity}` : ""
                  }`.trim(),
                  item_type: "departure",
                  auto_generated: true,
                  source_field_id: advancingFieldId,
                });

                if (!flightResult.success) {
                  logger.error("Failed to create flight schedule item", {
                    error: flightResult.error,
                  });
                }
              }

              // Reset form
              setAirlineName("");
              setFlightNumber("");
              setBookingRef("");
              setTicketNumber("");
              setAircraftModel("");
              setFullName("");
              setDepartureAirportCode("");
              setDepartureAirportCity("");
              setDepartureTime("");
              setArrivalAirportCode("");
              setArrivalAirportCity("");
              setArrivalTime("");
              setSeatNumber("");
              setTravelClass("");
              setIsOpen(false);

              // Reload the page to show updated data
              window.location.reload();
            } catch (error) {
              logger.error("Error saving flight data", error);
            } finally {
              setIsSaving(false);
            }
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Airline Name
              </label>
              <Input
                type="text"
                value={airlineName}
                onChange={(e) => setAirlineName(e.target.value)}
                placeholder="Enter airline name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Flight Number
              </label>
              <Input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="e.g. AA123"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Booking Reference
            </label>
            <Input
              type="text"
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value)}
              placeholder="Enter booking reference"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ticket Number
              </label>
              <Input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="Enter ticket number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Aircraft Model
              </label>
              <Input
                type="text"
                value={aircraftModel}
                onChange={(e) => setAircraftModel(e.target.value)}
                placeholder="e.g. Boeing 737"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Travel Class
              </label>
              <Input
                type="text"
                value={travelClass}
                onChange={(e) => setTravelClass(e.target.value)}
                placeholder="e.g. Economy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Departure</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Airport Code
                </label>
                <Input
                  type="text"
                  value={departureAirportCode}
                  onChange={(e) => setDepartureAirportCode(e.target.value)}
                  placeholder="e.g. JFK"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  City
                </label>
                <Input
                  type="text"
                  value={departureAirportCity}
                  onChange={(e) => setDepartureAirportCity(e.target.value)}
                  placeholder="e.g. New York"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Time
                </label>
                <Input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Arrival</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Airport Code
                </label>
                <Input
                  type="text"
                  value={arrivalAirportCode}
                  onChange={(e) => setArrivalAirportCode(e.target.value)}
                  placeholder="e.g. LAX"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  City
                </label>
                <Input
                  type="text"
                  value={arrivalAirportCity}
                  onChange={(e) => setArrivalAirportCity(e.target.value)}
                  placeholder="e.g. Los Angeles"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Time
                </label>
                <Input
                  type="datetime-local"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Seat Number
            </label>
            <Input
              type="text"
              value={seatNumber}
              onChange={(e) => setSeatNumber(e.target.value)}
              placeholder="e.g. 12A"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add Flight"}
            </Button>
          </div>
        </form>
      </Popup>

      {/* Flight Details Popup */}
      <Popup
        title="Flight"
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        className="sm:max-w-[540px]"
      >
        <div className="space-y-6">
          {/* Airline and Flight Number */}
          {(flightInfo?.airlineName || flightInfo?.flightNumber) && (
            <div>
              <h3 className="text-xl font-header text-card-foreground mb-1">
                {flightInfo.airlineName && flightInfo.flightNumber
                  ? `${flightInfo.airlineName} ${flightInfo.flightNumber}`
                  : flightInfo.flightNumber || flightInfo.airlineName}
              </h3>
            </div>
          )}

          {/* Departure and Arrival Times */}
          {(flightInfo?.departureDateTime || flightInfo?.arrivalDateTime) && (
            <div className="bg-card-cell rounded-lg p-4">
              <div className="flex justify-between gap-4">
                {/* Departure */}
                {flightInfo.departureDateTime && (
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-description-foreground font-bold mb-1 flex items-center gap-2">
                      <span>Departure</span>
                    </div>
                    <div className="text-lg font-header text-card-foreground">
                      {flightInfo.departureAirportCode || "Airport"}
                    </div>
                    {flightInfo.departureAirportCity && (
                      <div className="text-sm text-description-foreground">
                        {flightInfo.departureAirportCity}
                      </div>
                    )}
                    <div className="text-sm text-description-foreground mt-2">
                      {new Date(
                        flightInfo.departureDateTime
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-description-foreground">
                      {new Date(
                        flightInfo.departureDateTime
                      ).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {flightInfo.departureDateTime && flightInfo.arrivalDateTime && (
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-700"></div>
                  </div>
                )}

                {/* Arrival */}
                {flightInfo.arrivalDateTime && (
                  <div className="-ml-4 flex flex-col gap-1">
                    <div className="text-sm text-description-foreground font-bold mb-1 flex items-center gap-2">
                      <span>Arrival</span>
                    </div>
                    <div className="text-lg font-header text-card-foreground">
                      {flightInfo.arrivalAirportCode || "Airport"}
                    </div>
                    {flightInfo.arrivalAirportCity && (
                      <div className="text-sm text-description-foreground">
                        {flightInfo.arrivalAirportCity}
                      </div>
                    )}
                    <div className="text-sm text-description-foreground mt-2">
                      {new Date(flightInfo.arrivalDateTime).toLocaleDateString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </div>
                    <div className="text-sm text-description-foreground">
                      {new Date(flightInfo.arrivalDateTime).toLocaleTimeString(
                        "en-GB",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="w-full h-[1px] bg-foreground/20 rounded-full" />

          {/* Flight Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {flightInfo?.ticketNumber && (
              <div>
                <h4 className="text-sm font-header text-card-foreground mb-1">
                  Ticket Number
                </h4>
                <p className="text-sm text-description-foreground">
                  {flightInfo.ticketNumber}
                </p>
              </div>
            )}
            {flightInfo?.aircraftModel && (
              <div>
                <h4 className="text-sm font-header text-card-foreground mb-1">
                  Aircraft
                </h4>
                <p className="text-sm text-description-foreground">
                  {flightInfo.aircraftModel}
                </p>
              </div>
            )}
            {flightInfo?.seatNumber && (
              <div>
                <h4 className="text-sm font-header text-card-foreground mb-1">
                  Seat
                </h4>
                <p className="text-sm text-description-foreground">
                  {flightInfo.seatNumber}
                </p>
              </div>
            )}
            {flightInfo?.travelClass && (
              <div>
                <h4 className="text-sm font-header text-card-foreground mb-1">
                  Class
                </h4>
                <p className="text-sm text-description-foreground">
                  {flightInfo.travelClass}
                </p>
              </div>
            )}
          </div>

          {/* Booking References */}
          {flightInfo?.bookingRef && (
            <>
              <div className="w-full h-[1px] bg-foreground/20 rounded-full" />
              <div>
                <h4 className="text-sm font-header text-card-foreground mb-2">
                  Booking Reference
                </h4>
                <p className="text-sm text-description-foreground">
                  {flightInfo.bookingRef}
                </p>
              </div>
            </>
          )}
        </div>
      </Popup>
    </div>
  );
}
