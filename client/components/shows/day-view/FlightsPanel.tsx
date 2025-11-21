"use client";

import { Plane, PlaneLanding } from "lucide-react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [isOpen, setIsOpen] = useState(false);
  const [airlineName, setAirlineName] = useState("");
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
  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl text-card-foreground font-header">
          {/* <Plane className="w-4 h-4 text-cyan-400" /> */}
          Flights
        </h3>
        <button
          onClick={() => setIsOpen(true)}
          className="text-button-bg hover:text-button-bg-hover cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

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
        <div>
          <p className="text-sm text-neutral-400">
            {selectedPeopleIds.length === 0
              ? "Select people above to view flight information"
              : "No flights scheduled for this date"}
          </p>
        </div>
      )}
      <Popup
        title="Flights"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-[720px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Handle add flight logic here
            setIsOpen(false);
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
                className="bg-card-cell! border-card-cell-border"
                required
              />
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
                className="bg-card-cell! border-card-cell-border"
              />
            </div>
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
                className="bg-card-cell! border-card-cell-border"
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
                className="bg-card-cell! border-card-cell-border"
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
                className="bg-card-cell! border-card-cell-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Passenger Full Name
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter passenger full name"
              className="bg-card-cell! border-card-cell-border"
              required
            />
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
                  className="bg-card-cell! border-card-cell-border"
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
                  className="bg-card-cell! border-card-cell-border"
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
                  className="bg-card-cell! border-card-cell-border"
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
                  className="bg-card-cell! border-card-cell-border"
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
                  className="bg-card-cell! border-card-cell-border"
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
                  className="bg-card-cell! border-card-cell-border"
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
              className="bg-card-cell! border-card-cell-border"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" size="sm">
              Add Flight
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
