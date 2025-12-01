"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableText } from "@/components/ui/editable-text";
import { MarqueeText } from "@/components/ui/marquee-text";
import { saveFlight } from "@/lib/actions/advancing";
import type { FlightData as FlightDataAction } from "@/lib/actions/advancing/flights";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItemsForShow,
} from "@/lib/actions/schedule";
import { logger } from "@/lib/logger";
import { cn, formatTime } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type AdvancingFlight = Database["public"]["Tables"]["advancing_flights"]["Row"];

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

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
  flightsData?: AdvancingFlight[];
}

export function FlightsPanel({
  advancingFields,
  orgSlug,
  showId,
  flightsData = [],
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

  // Track flights in local state to allow inline editing updates
  const [localFlights, setLocalFlights] =
    useState<AdvancingFlight[]>(flightsData);

  useEffect(() => {
    setLocalFlights(flightsData);
  }, [flightsData]);

  // Get the selected flight record
  const selectedFlight = useMemo(
    () =>
      selectedFlightIndex !== null ? localFlights[selectedFlightIndex] : null,
    [localFlights, selectedFlightIndex]
  );

  // Convert flightsData from database format to UI format
  const flights: FlightData[] = localFlights.map((f) => ({
    airlineName: f.airline || undefined,
    flightNumber: f.flight_number || undefined,
    bookingRef: f.booking_ref || undefined,
    ticketNumber: f.ticket_number || undefined,
    aircraftModel: f.aircraft_model || undefined,
    fullName: f.passenger_name || undefined,
    departureAirportCode: f.depart_airport_code || undefined,
    departureAirportCity: f.depart_city || undefined,
    departureDateTime: f.depart_at || undefined,
    arrivalAirportCode: f.arrival_airport_code || undefined,
    arrivalAirportCity: f.arrival_city || undefined,
    arrivalDateTime: f.arrival_at || undefined,
    seatNumber: f.seat_number || undefined,
    travelClass: f.travel_class || undefined,
  }));

  // Show first 3 flights in the panel

  const hasMoreFlights = flights.length > 3;
  const handleFlightClick = (index: number) => {
    setSelectedFlightIndex(index);
  };

  const toLocalDateTimeValue = (iso?: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toIsoOrUndefined = (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  };

  const sanitizeText = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const persistFlightUpdate = async (
    flight: AdvancingFlight,
    updates: Partial<FlightDataAction>
  ) => {
    const payload: FlightDataAction = {
      direction: (flight.direction as "arrival" | "departure") || "departure",
      airline: flight.airline ?? undefined,
      flightNumber: flight.flight_number ?? undefined,
      bookingRef: flight.booking_ref ?? undefined,
      ticketNumber: flight.ticket_number ?? undefined,
      aircraftModel: flight.aircraft_model ?? undefined,
      passengerName: flight.passenger_name ?? undefined,
      departAirportCode: flight.depart_airport_code ?? undefined,
      departCity: flight.depart_city ?? undefined,
      departAt: flight.depart_at ?? undefined,
      arrivalAirportCode: flight.arrival_airport_code ?? undefined,
      arrivalCity: flight.arrival_city ?? undefined,
      arrivalAt: flight.arrival_at ?? undefined,
      seatNumber: flight.seat_number ?? undefined,
      travelClass: flight.travel_class ?? undefined,
      notes: flight.notes ?? undefined,
      ...updates,
    };

    const result = await saveFlight(
      orgSlug,
      showId,
      payload,
      flight.person_id ?? undefined,
      flight.id,
      (flight.source as "artist" | "promoter") || "artist"
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to update flight");
    }

    // Update local state
    setLocalFlights((prev) =>
      prev.map((f) => (f.id === flight.id ? result.data! : f))
    );
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
    <div className="bg-card  border border-card-border rounded-[20px] px-4 py-6">
      <div className="flex justify-between items-center mb-2">
        <h3
          onClick={() => setIsOverviewOpen(true)}
          title="View All Flights"
          className="text-xl text-card-foreground font-header hover:bg-card-hover cursor-pointer px-2 py-1 rounded transition-colors"
        >
          Flights
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="text-button-bg hover:text-button-bg-hover cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {flights.length === 0 ? (
        <div className="px-2">
          <p className="text-sm text-description-foreground">
            No flight information available
          </p>
          <p className="text-xs text-description-foreground mt-2">
            Flight details will be shown here
          </p>
        </div>
      ) : (
        <div className="space-y-3 px-2">
          {flights.map((flight, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg ">
              {/* Flight Number Circle */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card-cell text-card-foreground flex items-center justify-center text-sm">
                {index + 1}
              </div>

              {/* Flight Details */}
              <div
                className="flex-1 min-w-0 flex flex-col gap-2 border-foreground/40 border py-3 px-4 rounded-[20px] bg-card cursor-pointer hover:bg-card-hover transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlightClick(index);
                }}
              >
                {/* Top Row: Airline Name */}
                <MarqueeText className="font-header text-xs md:text-sm">
                  {flight.airlineName || "AIRLINE"}
                </MarqueeText>

                {/* Middle Row: Flight Number, Airport Codes, and Line */}
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  {/* Departure Airport Code and Time */}
                  <div className="text-center shrink-0 max-w-[30%]">
                    <MarqueeText className="font-header text-sm md:text-2xl">
                      {flight.departureAirportCode || "DEP"}
                    </MarqueeText>
                    {flight.departureDateTime && (
                      <div className="text-xs text-description-foreground">
                        {formatTime(flight.departureDateTime)}
                      </div>
                    )}
                  </div>

                  {/* Center: Flight Number, Line, and Duration */}
                  <div className="flex-1 min-w-0 flex flex-col items-center gap-1 overflow-hidden">
                    <MarqueeText className="text-xs text-description-foreground w-full text-center">
                      {flight.flightNumber || ""}
                    </MarqueeText>
                    <div className="w-full h-[1px] bg-description-foreground" />
                    {flight.departureDateTime && flight.arrivalDateTime && (
                      <MarqueeText className="text-xs text-description-foreground truncate w-full text-center">
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
                      </MarqueeText>
                    )}
                  </div>

                  {/* Arrival Airport Code and Time */}
                  <div className="text-center shrink-0 max-w-[30%]">
                    <MarqueeText className="font-header text-sm md:text-2xl">
                      {flight.arrivalAirportCode || "ARR"}
                    </MarqueeText>
                    {flight.arrivalDateTime && (
                      <div className="text-xs text-description-foreground">
                        {formatTime(flight.arrivalDateTime)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div onClick={(e) => e.stopPropagation()}>
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

                // Add to existing flights array for local state
                const updatedFlights = [...flights, newFlight];

                // Save the new flight using the new saveFlight function
                const result = await saveFlight(orgSlug, showId, {
                  direction: "departure", // Default to departure, can be updated later
                  airline: airlineName,
                  flightNumber,
                  bookingRef,
                  ticketNumber,
                  aircraftModel,
                  passengerName: fullName,
                  departAirportCode: departureAirportCode,
                  departCity: departureAirportCity,
                  departAt: departureISO,
                  arrivalAirportCode,
                  arrivalCity: arrivalAirportCity,
                  arrivalAt: arrivalISO,
                  seatNumber,
                  travelClass,
                  autoSchedule: true,
                });

                if (!result.success) {
                  logger.error("Failed to save flight data", {
                    error: result.error,
                  });
                  throw new Error(result.error || "Failed to save flight data");
                }

                const flightId = result.data?.id;

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

                // Create schedule item for the new flight
                if (departureISO && arrivalISO) {
                  const cityNotes = `${
                    departureAirportCity ? `From ${departureAirportCity}` : ""
                  } ${
                    arrivalAirportCity ? `to ${arrivalAirportCity}` : ""
                  }`.trim();

                  const flightResult = await createScheduleItem(
                    orgSlug,
                    showId,
                    {
                      title: `Flight ${flightNumber || ""} - ${
                        airlineName || "Flight"
                      }`,
                      starts_at: departureISO,
                      ends_at: arrivalISO,
                      location: `${departureAirportCode || "DEP"} → ${
                        arrivalAirportCode || "ARR"
                      }`,
                      notes: cityNotes,
                      item_type: "departure",
                      auto_generated: true,
                    }
                  );

                  if (!flightResult.success) {
                    logger.error("Failed to create flight schedule item", {
                      error: flightResult.error,
                    });
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
                <h4 className="text-sm font-medium text-foreground">
                  Departure
                </h4>
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
      </div>

      {/* Flight Overview Popup - Shows all flights */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popup
          title="All Flights"
          open={isOverviewOpen}
          onOpenChange={setIsOverviewOpen}
          className="sm:max-w-[800px]"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">
            {flights.map((flight, index) => (
              <div className="flex items-center gap-3" key={index}>
                <div className="w-12 h-12 rounded-full bg-card hidden md:flex items-center justify-center border border-card-border">
                  <span className="font-header text-sm text-card-foreground">
                    {index + 1}
                  </span>
                </div>
                <div
                  className="relative cursor-pointer bg-card-cell hover:bg-card-cell/75 hover:scale-102 transition-all duration-300 rounded-[20px] px-4 py-2 md:px-6 md:py-4 border border-card-border w-full"
                  onClick={() => {
                    setIsOverviewOpen(false);
                    setSelectedFlightIndex(index);
                  }}
                >
                  {/* Circle on the right edge */}

                  {/* Airline Name Header */}
                  <div className="flex justify-between pr-6">
                    <div className="font-header text-sm md:text-lg mb-4">
                      {flight.airlineName || "AIRLINE"}
                    </div>
                    <div className="text-xs md:text-sm text-description-foreground">
                      <span className="font-bold">Flight</span>&nbsp;
                      {flight.flightNumber || ""}
                    </div>
                  </div>
                  {/* Main Content - Two Groups */}
                  <div className="flex justify-between items-center pr-6">
                    {/* Left Group */}
                    <div className="grid grid-cols-2 justify-between min-w-[30%] gap-8">
                      {/* Booking Ref */}
                      <div className="flex flex-col ">
                        <div className="text-xs md:text-sm font-header">
                          {flight.bookingRef || "N/A"}
                        </div>
                        <div className="text-xs md:text-xs text-description-foreground">
                          Booking Ref
                        </div>
                      </div>

                      {/* Ticket */}
                      <div className="flex flex-col ">
                        <div className="text-xs md:text-sm font-header">
                          {flight.ticketNumber || "N/A"}
                        </div>
                        <div className="text-xs md:text-xs text-description-foreground">
                          Ticket #
                        </div>
                      </div>

                      {/* Aircraft */}
                      <div className="flex flex-col ">
                        <div className="text-xs md:text-sm font-header">
                          {flight.aircraftModel || "N/A"}
                        </div>
                        <div className="text-xs md:text-xs text-description-foreground">
                          Aircraft
                        </div>
                      </div>

                      {/* Full Name */}
                      <div className="flex flex-col ">
                        <div className="text-xs md:text-sm font-header">
                          {flight.fullName || "N/A"}
                        </div>
                        <div className="text-xs md:text-xs text-description-foreground">
                          Full Name
                        </div>
                      </div>
                    </div>

                    {/* Right Group */}
                    <div className="grid grid-cols-2 min-w-[30%] gap-8">
                      {/* Departure and Arrival - Takes up 2 grid columns */}
                      <div className="flex col-span-2 justify-between relative gap-2">
                        {/* Departure */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-xs md:text-xs text-description-foreground">
                            {flight.departureAirportCity || "Departure"}
                          </div>
                          <div className="font-header text-sm md:text-xl">
                            {flight.departureAirportCode || "DEP"}
                          </div>
                          {flight.departureDateTime && (
                            <div className="text-xs md:text-xs text-description-foreground">
                              {formatTime(flight.departureDateTime)}
                            </div>
                          )}
                        </div>

                        {/* Center Line and Duration */}
                        <div className="justify-center flex flex-col items-center gap-1 ">
                          <div className="w-12 h-[1px] bg-description-foreground" />
                          {flight.departureDateTime &&
                            flight.arrivalDateTime && (
                              <div className="text-xs md:text-xs text-description-foreground whitespace-nowrap">
                                {(() => {
                                  const departure = new Date(
                                    flight.departureDateTime
                                  );
                                  const arrival = new Date(
                                    flight.arrivalDateTime
                                  );
                                  const durationMs =
                                    arrival.getTime() - departure.getTime();
                                  const hours = Math.floor(
                                    durationMs / (1000 * 60 * 60)
                                  );
                                  const minutes = Math.floor(
                                    (durationMs % (1000 * 60 * 60)) /
                                      (1000 * 60)
                                  );
                                  return `${hours}h ${minutes}min`;
                                })()}
                              </div>
                            )}
                        </div>

                        {/* Arrival */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-xs md:text-xs text-description-foreground ">
                            {flight.arrivalAirportCity || "Arrival"}
                          </div>
                          <div className="font-header text-sm md:text-xl">
                            {flight.arrivalAirportCode || "ARR"}
                          </div>
                          {flight.arrivalDateTime && (
                            <div className="text-xs md:text-xs text-description-foreground">
                              {formatTime(flight.arrivalDateTime)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Seat - Takes up 1 grid column */}
                      <div className="col-span-2 flex justify-between">
                        <div className="flex flex-col items-center text-center">
                          <div className="text-xs md:text-sm font-header">
                            {flight.seatNumber || "N/A"}
                          </div>
                          <div className="text-xs md:text-xs text-description-foreground ">
                            Seat
                          </div>
                        </div>

                        {/* Class - Takes up 1 grid column */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-xs md:text-sm font-header">
                            {flight.travelClass || "N/A"}
                          </div>
                          <div className="text-xs md:text-xs text-description-foreground ">
                            Class
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-card flex items-center justify-center border border-card-border" />
                </div>
              </div>
            ))}
          </div>
        </Popup>
      </div>

      {/* Flight Details Popup - Shows individual flight */}
      <div onClick={(e) => e.stopPropagation()}>
        <Popup
          title={`Flight ${
            selectedFlightIndex !== null ? selectedFlightIndex + 1 : ""
          }`}
          open={selectedFlightIndex !== null}
          onOpenChange={(open) => !open && setSelectedFlightIndex(null)}
          className="sm:max-w-[800px]"
        >
          {selectedFlightIndex !== null && selectedFlight && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative bg-card-cell rounded-[20px] px-4 py-2 md:px-6 md:py-4 border border-card-border w-full">
                  {/* Airline Name Header */}
                  <div className="flex justify-between pr-6">
                    <EditableText
                      value={selectedFlight.airline || ""}
                      onSave={(v) =>
                        persistFlightUpdate(selectedFlight, {
                          airline: sanitizeText(v),
                        })
                      }
                      placeholder="Airline"
                      className={cn(
                        "font-header text-sm md:text-lg mb-4",
                        inlineEditButtonClasses
                      )}
                    />
                    <div className="text-xs md:text-sm text-description-foreground flex items-center gap-1">
                      <span className="font-bold">Flight</span>
                      <EditableText
                        value={selectedFlight.flight_number || ""}
                        onSave={(v) =>
                          persistFlightUpdate(selectedFlight, {
                            flightNumber: sanitizeText(v),
                          })
                        }
                        placeholder="###"
                        className={cn(
                          "text-xs md:text-sm",
                          inlineEditButtonClasses
                        )}
                      />
                    </div>
                  </div>
                  {/* Main Content - Two Groups */}
                  <div className="flex justify-between items-center pr-6">
                    {/* Left Group */}
                    <div className="grid grid-cols-2 justify-between min-w-[30%] gap-8">
                      {/* Booking Ref */}
                      <div className="flex flex-col ">
                        <EditableText
                          value={selectedFlight.booking_ref || ""}
                          onSave={(v) =>
                            persistFlightUpdate(selectedFlight, {
                              bookingRef: sanitizeText(v),
                            })
                          }
                          placeholder="N/A"
                          className={cn(
                            "text-xs md:text-sm font-header",
                            inlineEditButtonClasses
                          )}
                        />
                        <div className="text-xs md:text-xs text-description-foreground">
                          Booking Ref
                        </div>
                      </div>

                      {/* Ticket */}
                      <div className="flex flex-col ">
                        <EditableText
                          value={selectedFlight.ticket_number || ""}
                          onSave={(v) =>
                            persistFlightUpdate(selectedFlight, {
                              ticketNumber: sanitizeText(v),
                            })
                          }
                          placeholder="N/A"
                          className={cn(
                            "text-xs md:text-sm font-header",
                            inlineEditButtonClasses
                          )}
                        />
                        <div className="text-xs md:text-xs text-description-foreground">
                          Ticket #
                        </div>
                      </div>

                      {/* Aircraft */}
                      <div className="flex flex-col ">
                        <EditableText
                          value={selectedFlight.aircraft_model || ""}
                          onSave={(v) =>
                            persistFlightUpdate(selectedFlight, {
                              aircraftModel: sanitizeText(v),
                            })
                          }
                          placeholder="N/A"
                          className={cn(
                            "text-xs md:text-sm font-header",
                            inlineEditButtonClasses
                          )}
                        />
                        <div className="text-xs md:text-xs text-description-foreground">
                          Aircraft
                        </div>
                      </div>

                      {/* Full Name */}
                      <div className="flex flex-col ">
                        <EditableText
                          value={selectedFlight.passenger_name || ""}
                          onSave={(v) =>
                            persistFlightUpdate(selectedFlight, {
                              passengerName: sanitizeText(v),
                            })
                          }
                          placeholder="N/A"
                          className={cn(
                            "text-xs md:text-sm font-header",
                            inlineEditButtonClasses
                          )}
                        />
                        <div className="text-xs md:text-xs text-description-foreground">
                          Full Name
                        </div>
                      </div>
                    </div>

                    {/* Right Group */}
                    <div className="grid grid-cols-2 min-w-[30%] gap-8">
                      {/* Departure and Arrival - Takes up 2 grid columns */}
                      <div className="flex col-span-2 justify-between relative gap-2">
                        {/* Departure */}
                        <div className="flex flex-col items-center text-center">
                          <EditableText
                            value={selectedFlight.depart_city || ""}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                departCity: sanitizeText(v),
                              })
                            }
                            placeholder="City"
                            className={cn(
                              "text-xs md:text-xs text-description-foreground",
                              inlineEditButtonClasses
                            )}
                          />
                          <EditableText
                            value={selectedFlight.depart_airport_code || ""}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                departAirportCode: sanitizeText(v),
                              })
                            }
                            placeholder="DEP"
                            className={cn(
                              "font-header text-sm md:text-xl",
                              inlineEditButtonClasses
                            )}
                          />
                          <EditableText
                            value={toLocalDateTimeValue(
                              selectedFlight.depart_at
                            )}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                departAt: toIsoOrUndefined(v),
                              })
                            }
                            placeholder="Select time"
                            inputType="datetime-local"
                            className={cn(
                              "text-xs md:text-xs text-description-foreground",
                              inlineEditButtonClasses
                            )}
                            displayValue={
                              selectedFlight.depart_at
                                ? formatTime(selectedFlight.depart_at)
                                : "Set time"
                            }
                          />
                        </div>

                        {/* Center Line and Duration */}
                        <div className="justify-center flex flex-col items-center gap-1 ">
                          <div className="w-12 h-[1px] bg-description-foreground" />
                          {selectedFlight.depart_at &&
                            selectedFlight.arrival_at && (
                              <div className="text-xs md:text-xs text-description-foreground whitespace-nowrap">
                                {(() => {
                                  const departure = new Date(
                                    selectedFlight.depart_at
                                  );
                                  const arrival = new Date(
                                    selectedFlight.arrival_at
                                  );
                                  const durationMs =
                                    arrival.getTime() - departure.getTime();
                                  const hours = Math.floor(
                                    durationMs / (1000 * 60 * 60)
                                  );
                                  const minutes = Math.floor(
                                    (durationMs % (1000 * 60 * 60)) /
                                      (1000 * 60)
                                  );
                                  return `${hours}h ${minutes}min`;
                                })()}
                              </div>
                            )}
                        </div>

                        {/* Arrival */}
                        <div className="flex flex-col items-center text-center">
                          <EditableText
                            value={selectedFlight.arrival_city || ""}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                arrivalCity: sanitizeText(v),
                              })
                            }
                            placeholder="City"
                            className={cn(
                              "text-xs md:text-xs text-description-foreground",
                              inlineEditButtonClasses
                            )}
                          />
                          <EditableText
                            value={selectedFlight.arrival_airport_code || ""}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                arrivalAirportCode: sanitizeText(v),
                              })
                            }
                            placeholder="ARR"
                            className={cn(
                              "font-header text-sm md:text-xl",
                              inlineEditButtonClasses
                            )}
                          />
                          <EditableText
                            value={toLocalDateTimeValue(
                              selectedFlight.arrival_at
                            )}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                arrivalAt: toIsoOrUndefined(v),
                              })
                            }
                            placeholder="Select time"
                            inputType="datetime-local"
                            className={cn(
                              "text-xs md:text-xs text-description-foreground",
                              inlineEditButtonClasses
                            )}
                            displayValue={
                              selectedFlight.arrival_at
                                ? formatTime(selectedFlight.arrival_at)
                                : "Set time"
                            }
                          />
                        </div>
                      </div>

                      {/* Seat - Takes up 1 grid column */}
                      <div className="col-span-2 flex justify-between text-center">
                        <div className="flex flex-col items-center">
                          <EditableText
                            value={selectedFlight.seat_number || ""}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                seatNumber: sanitizeText(v),
                              })
                            }
                            placeholder="N/A"
                            className={cn(
                              "text-xs md:text-sm font-header",
                              inlineEditButtonClasses
                            )}
                          />
                          <div className="text-xs md:text-xs text-description-foreground ">
                            Seat
                          </div>
                        </div>

                        {/* Class - Takes up 1 grid column */}
                        <div className="flex flex-col items-center text-center">
                          <EditableText
                            value={selectedFlight.travel_class || ""}
                            onSave={(v) =>
                              persistFlightUpdate(selectedFlight, {
                                travelClass: sanitizeText(v),
                              })
                            }
                            placeholder="N/A"
                            className={cn(
                              "text-xs md:text-sm font-header",
                              inlineEditButtonClasses
                            )}
                          />
                          <div className="text-xs md:text-xs text-description-foreground ">
                            Class
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-card flex items-center justify-center" />
                </div>
              </div>
            </div>
          )}
        </Popup>
      </div>
    </div>
  );
}
