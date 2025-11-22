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

interface FlightData {
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
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedFlightIndex, setSelectedFlightIndex] = useState<number | null>(
    null
  );
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

  // Extract flights array from JSON field
  const flightsField = advancingFields.find((f) => f.field_name === "flights");
  const flights = (flightsField?.value as FlightData[] | undefined) || [];

  // Show first 3 flights in the panel
  const visibleFlights = flights.slice(0, 3);
  const hasMoreFlights = flights.length > 3;
  const handleFlightClick = (index: number) => {
    setSelectedFlightIndex(index);
  };

  const resetForm = () => {
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
  };

  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex justify-between items-center mb-4">
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

      {flights.length === 0 ? (
        <div>
          <p className="text-sm text-neutral-400">
            No flight information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Flight details will be shown here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleFlights.map((flight, index) => (
            <div
              key={index}
              className="cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-3 rounded-lg "
              onClick={() => handleFlightClick(index)}
            >
              {/* Flight Number Circle */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card-cell text-card-foreground flex items-center justify-center text-sm">
                {index + 1}
              </div>

              {/* Flight Details */}
              <div className="flex-1 flex flex-col gap-2 border-foreground/40 border py-3 px-4 rounded-[20px]">
                {/* Top Row: Airline Name */}
                <div className="font-header text-sm">
                  {flight.airlineName || "AIRLINE"}
                </div>

                {/* Middle Row: Flight Number, Airport Codes, and Line */}
                <div className="flex items-center justify-between gap-3">
                  {/* Departure Airport Code and Time */}
                  <div className="text-center">
                    <div className="font-header text-2xl">
                      {flight.departureAirportCode || "DEP"}
                    </div>
                    {flight.departureDateTime && (
                      <div className="text-xs text-description-foreground">
                        {new Date(flight.departureDateTime).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }
                        )}
                      </div>
                    )}
                  </div>

                  {/* Center: Flight Number, Line, and Duration */}
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-description-foreground">
                      {flight.flightNumber || ""}
                    </div>
                    <div className="w-full h-[1px] bg-description-foreground" />
                    {flight.departureDateTime && flight.arrivalDateTime && (
                      <div className="text-xs text-description-foreground">
                        {(() => {
                          const departure = new Date(flight.departureDateTime);
                          const arrival = new Date(flight.arrivalDateTime);
                          const durationMs =
                            arrival.getTime() - departure.getTime();
                          const hours = Math.floor(
                            durationMs / (1000 * 60 * 60)
                          );
                          const minutes = Math.floor(
                            (durationMs % (1000 * 60 * 60)) / (1000 * 60)
                          );
                          return `${hours}h ${minutes}m`;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Arrival Airport Code and Time */}
                  <div className="text-center">
                    <div className="font-header text-2xl">
                      {flight.arrivalAirportCode || "ARR"}
                    </div>
                    {flight.arrivalDateTime && (
                      <div className="text-xs text-description-foreground">
                        {new Date(flight.arrivalDateTime).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMoreFlights && (
            <button
              onClick={() => setIsOverviewOpen(true)}
              className="w-full text-center text-sm text-button-bg hover:text-button-bg-hover py-2"
            >
              View all {flights.length} flights
            </button>
          )}
        </div>
      )}
      <Popup
        title="Add Flight"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-[720px]"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            setIsSaving(true);

            try {
              // Convert datetime-local values to ISO strings
              const departureISO = departureTime
                ? new Date(departureTime).toISOString()
                : "";
              const arrivalISO = arrivalTime
                ? new Date(arrivalTime).toISOString()
                : "";

              // Create new flight object
              const newFlight: FlightData = {
                airlineName,
                flightNumber,
                bookingRef,
                ticketNumber,
                aircraftModel,
                fullName,
                departureAirportCode,
                departureAirportCity,
                departureDateTime: departureISO,
                arrivalAirportCode,
                arrivalAirportCity,
                arrivalDateTime: arrivalISO,
                seatNumber,
                travelClass,
              };

              // Add to existing flights array
              const updatedFlights = [...flights, newFlight];

              // Save all flights as a single JSON array
              const result = await createAdvancingField(orgSlug, showId, {
                section: "flight",
                fieldName: "flights",
                fieldType: "json",
                partyType: "from_you",
                value: updatedFlights as unknown as never,
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

              // Create schedule items for all flights
              for (let i = 0; i < updatedFlights.length; i++) {
                const flight = updatedFlights[i];
                if (flight.departureDateTime && flight.arrivalDateTime) {
                  const cityNotes = `${
                    flight.departureAirportCity
                      ? `From ${flight.departureAirportCity}`
                      : ""
                  } ${
                    flight.arrivalAirportCity
                      ? `to ${flight.arrivalAirportCity}`
                      : ""
                  }`.trim();
                  const notesWithIndex = `[FLIGHT_INDEX:${i}]${
                    cityNotes ? ` ${cityNotes}` : ""
                  }`;

                  const flightResult = await createScheduleItem(
                    orgSlug,
                    showId,
                    {
                      title: `Flight ${flight.flightNumber || i + 1} - ${
                        flight.airlineName || "Flight"
                      }`,
                      starts_at: flight.departureDateTime,
                      ends_at: flight.arrivalDateTime,
                      location: `${flight.departureAirportCode || "DEP"} → ${
                        flight.arrivalAirportCode || "ARR"
                      }`,
                      notes: notesWithIndex,
                      item_type: "departure",
                      auto_generated: true,
                      source_field_id: advancingFieldId,
                    }
                  );

                  if (!flightResult.success) {
                    logger.error("Failed to create flight schedule item", {
                      error: flightResult.error,
                    });
                  }
                }
              }

              // Reset form
              resetForm();
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
                  min={departureTime || undefined}
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

      {/* Flight Overview Popup - Shows all flights */}
      <Popup
        title="All Flights"
        open={isOverviewOpen}
        onOpenChange={setIsOverviewOpen}
        className="sm:max-w-[800px]"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">
          {flights.map((flight, index) => (
            <div className="flex items-center gap-3" key={index}>
              <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center border border-card-border">
                <span className="font-header text-sm text-card-foreground">
                  {index + 1}
                </span>
              </div>
              <div
                className="relative cursor-pointer bg-card-cell hover:bg-card-cell/75 hover:scale-102 transition-all duration-300 rounded-[20px] p-6 border border-card-border w-full"
                onClick={() => {
                  setIsOverviewOpen(false);
                  setSelectedFlightIndex(index);
                }}
              >
                {/* Circle on the right edge */}

                {/* Airline Name Header */}
                <div className="font-header text-lg mb-4">
                  {flight.airlineName || "AIRLINE"}
                </div>

                {/* Main Content - Two Groups */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Group */}
                  <div className="grid grid-cols-2">
                    {/* Booking Ref */}
                    <div className="flex flex-col ">
                      <div className="text-sm font-header">
                        {flight.bookingRef || "—"}
                      </div>
                      <div className="text-xs text-description-foreground">
                        Booking Ref
                      </div>
                    </div>

                    {/* Ticket */}
                    <div className="flex flex-col ">
                      <div className="text-sm font-header">
                        {flight.ticketNumber || "—"}
                      </div>
                      <div className="text-xs text-description-foreground">
                        Ticket #
                      </div>
                    </div>

                    {/* Aircraft */}
                    <div className="flex flex-col ">
                      <div className="text-sm font-header">
                        {flight.aircraftModel || "—"}
                      </div>
                      <div className="text-xs text-description-foreground">
                        Aircraft
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="flex flex-col ">
                      <div className="text-sm font-header">
                        {flight.fullName || "—"}
                      </div>
                      <div className="text-xs text-description-foreground">
                        Full Name
                      </div>
                    </div>
                  </div>

                  {/* Right Group */}
                  <div className="gap-6 grid grid-cols-2">
                    {/* Departure and Arrival - Takes up 2 grid columns */}
                    <div className="col-span-2 grid grid-cols-2 gap-6 relative">
                      {/* Departure */}
                      <div className="flex flex-col">
                        <div className="text-xs text-description-foreground">
                          {flight.departureAirportCity || "Departure"}
                        </div>
                        <div className="font-header text-2xl">
                          {flight.departureAirportCode || "DEP"}
                        </div>
                        {flight.departureDateTime && (
                          <div className="text-xs text-description-foreground">
                            {new Date(
                              flight.departureDateTime
                            ).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        )}
                      </div>

                      {/* Center Line and Duration */}
                      <div className="absolute right-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                        <div className="text-xs text-description-foreground">
                          {flight.flightNumber || ""}
                        </div>
                        <div className="w-12 h-[1px] bg-description-foreground" />
                        {flight.departureDateTime && flight.arrivalDateTime && (
                          <div className="text-xs text-description-foreground whitespace-nowrap">
                            {(() => {
                              const departure = new Date(
                                flight.departureDateTime
                              );
                              const arrival = new Date(flight.arrivalDateTime);
                              const durationMs =
                                arrival.getTime() - departure.getTime();
                              const hours = Math.floor(
                                durationMs / (1000 * 60 * 60)
                              );
                              const minutes = Math.floor(
                                (durationMs % (1000 * 60 * 60)) / (1000 * 60)
                              );
                              return `${hours}h ${minutes}m`;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Arrival */}
                      <div className="flex flex-col ">
                        <div className="text-xs text-description-foreground ">
                          {flight.arrivalAirportCity || "Arrival"}
                        </div>
                        <div className="font-header text-2xl">
                          {flight.arrivalAirportCode || "ARR"}
                        </div>
                        {flight.arrivalDateTime && (
                          <div className="text-xs text-description-foreground">
                            {new Date(
                              flight.arrivalDateTime
                            ).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seat - Takes up 1 grid column */}
                    <div className="flex flex-col">
                      <div className="text-sm font-header">
                        {flight.seatNumber || "—"}
                      </div>
                      <div className="text-xs text-description-foreground ">
                        Seat
                      </div>
                    </div>

                    {/* Class - Takes up 1 grid column */}
                    <div className="flex flex-col">
                      <div className="text-sm font-header">
                        {flight.travelClass || "—"}
                      </div>
                      <div className="text-xs text-description-foreground ">
                        Class
                      </div>
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-card flex items-center justify-center border border-card-border" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Popup>

      {/* Flight Details Popup - Shows individual flight */}
      <Popup
        title={`Flight ${
          selectedFlightIndex !== null ? selectedFlightIndex + 1 : ""
        }`}
        open={selectedFlightIndex !== null}
        onOpenChange={(open) => !open && setSelectedFlightIndex(null)}
        className="sm:max-w-[540px]"
      >
        {selectedFlightIndex !== null && flights[selectedFlightIndex] && (
          <div className="space-y-6">
            {/* Airline and Flight Number */}
            {(flights[selectedFlightIndex].airlineName ||
              flights[selectedFlightIndex].flightNumber) && (
              <div>
                <h3 className="text-xl font-header text-card-foreground mb-1">
                  {flights[selectedFlightIndex].airlineName &&
                  flights[selectedFlightIndex].flightNumber
                    ? `${flights[selectedFlightIndex].airlineName} ${flights[selectedFlightIndex].flightNumber}`
                    : flights[selectedFlightIndex].flightNumber ||
                      flights[selectedFlightIndex].airlineName}
                </h3>
              </div>
            )}

            {/* Departure and Arrival Times */}
            {(flights[selectedFlightIndex].departureDateTime ||
              flights[selectedFlightIndex].arrivalDateTime) && (
              <div className="bg-card-cell rounded-lg p-4">
                <div className="flex justify-between gap-4">
                  {/* Departure */}
                  {flights[selectedFlightIndex].departureDateTime && (
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-description-foreground font-bold mb-1 flex items-center gap-2">
                        <span>Departure</span>
                      </div>
                      <div className="text-lg font-header text-card-foreground">
                        {flights[selectedFlightIndex].departureAirportCode ||
                          "Airport"}
                      </div>
                      {flights[selectedFlightIndex].departureAirportCity && (
                        <div className="text-sm text-description-foreground">
                          {flights[selectedFlightIndex].departureAirportCity}
                        </div>
                      )}
                      <div className="text-sm text-description-foreground mt-2">
                        {new Date(
                          flights[selectedFlightIndex].departureDateTime!
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-description-foreground">
                        {new Date(
                          flights[selectedFlightIndex].departureDateTime!
                        ).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {flights[selectedFlightIndex].departureDateTime &&
                    flights[selectedFlightIndex].arrivalDateTime && (
                      <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-700"></div>
                      </div>
                    )}

                  {/* Arrival */}
                  {flights[selectedFlightIndex].arrivalDateTime && (
                    <div className="-ml-4 flex flex-col gap-1">
                      <div className="text-sm text-description-foreground font-bold mb-1 flex items-center gap-2">
                        <span>Arrival</span>
                      </div>
                      <div className="text-lg font-header text-card-foreground">
                        {flights[selectedFlightIndex].arrivalAirportCode ||
                          "Airport"}
                      </div>
                      {flights[selectedFlightIndex].arrivalAirportCity && (
                        <div className="text-sm text-description-foreground">
                          {flights[selectedFlightIndex].arrivalAirportCity}
                        </div>
                      )}
                      <div className="text-sm text-description-foreground mt-2">
                        {new Date(
                          flights[selectedFlightIndex].arrivalDateTime!
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-description-foreground">
                        {new Date(
                          flights[selectedFlightIndex].arrivalDateTime!
                        ).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="w-full h-[1px] bg-foreground/20 rounded-full" />

            {/* Flight Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {flights[selectedFlightIndex].ticketNumber && (
                <div>
                  <h4 className="text-sm font-header text-card-foreground mb-1">
                    Ticket Number
                  </h4>
                  <p className="text-sm text-description-foreground">
                    {flights[selectedFlightIndex].ticketNumber}
                  </p>
                </div>
              )}
              {flights[selectedFlightIndex].aircraftModel && (
                <div>
                  <h4 className="text-sm font-header text-card-foreground mb-1">
                    Aircraft
                  </h4>
                  <p className="text-sm text-description-foreground">
                    {flights[selectedFlightIndex].aircraftModel}
                  </p>
                </div>
              )}
              {flights[selectedFlightIndex].seatNumber && (
                <div>
                  <h4 className="text-sm font-header text-card-foreground mb-1">
                    Seat
                  </h4>
                  <p className="text-sm text-description-foreground">
                    {flights[selectedFlightIndex].seatNumber}
                  </p>
                </div>
              )}
              {flights[selectedFlightIndex].travelClass && (
                <div>
                  <h4 className="text-sm font-header text-card-foreground mb-1">
                    Class
                  </h4>
                  <p className="text-sm text-description-foreground">
                    {flights[selectedFlightIndex].travelClass}
                  </p>
                </div>
              )}
            </div>

            {/* Booking References */}
            {flights[selectedFlightIndex].bookingRef && (
              <>
                <div className="w-full h-[1px] bg-foreground/20 rounded-full" />
                <div>
                  <h4 className="text-sm font-header text-card-foreground mb-2">
                    Booking Reference
                  </h4>
                  <p className="text-sm text-description-foreground">
                    {flights[selectedFlightIndex].bookingRef}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </Popup>
    </div>
  );
}
