"use client";

import { Calendar } from "lucide-react";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HotelPanelProps {
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

export function HotelPanel({
  advancingFields,
  assignedPeople,
}: HotelPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingRefs, setBookingRefs] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const addBookingRef = () => {
    setBookingRefs([...bookingRefs, ""]);
  };

  const updateBookingRef = (index: number, value: string) => {
    const newRefs = [...bookingRefs];
    newRefs[index] = value;
    setBookingRefs(newRefs);
  };

  const removeBookingRef = (index: number) => {
    if (bookingRefs.length > 1) {
      setBookingRefs(bookingRefs.filter((_, i) => i !== index));
    }
  };
  // Check for promoter accommodation general info
  const promoterAccommodation = advancingFields.find(
    (f) => f.field_name === "promoter_accommodation"
  )?.value as string | undefined;

  // Extract hotel information for assigned people (artist-specific)
  const hotelData = assignedPeople
    .map((person) => {
      if (!person.people) return null;

      const personId = person.person_id;
      const name = advancingFields.find(
        (f) => f.field_name === `hotel_${personId}_name`
      )?.value as string | undefined;
      const checkIn = advancingFields.find(
        (f) => f.field_name === `hotel_${personId}_checkIn`
      )?.value as string | undefined;
      const checkOut = advancingFields.find(
        (f) => f.field_name === `hotel_${personId}_checkOut`
      )?.value as string | undefined;
      const address = advancingFields.find(
        (f) => f.field_name === `hotel_${personId}_address`
      )?.value as string | undefined;

      if (!name && !checkIn && !checkOut) return null;

      return {
        personName: person.people.name,
        hotelName: name,
        checkIn,
        checkOut,
        address,
      };
    })
    .filter(Boolean);

  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium text-card-foreground font-header">
          Hotel
        </h3>
        <button
          onClick={() => setIsOpen(true)}
          className="text-button-bg hover:text-button-bg-hover cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {hotelData.length === 0 && !promoterAccommodation ? (
        <div>
          <p className="text-sm text-neutral-400">
            No hotel information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Hotel details will be shown here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Show promoter general accommodation info if available */}
          {promoterAccommodation && (
            <div>
              <div className="text-sm text-neutral-300 whitespace-pre-wrap">
                {promoterAccommodation}
              </div>
            </div>
          )}

          {/* Show per-person hotel data */}
          {hotelData.map((hotel, idx) => (
            <div key={idx} className="bg-neutral-800/50 rounded-lg p-4">
              <div className="font-medium text-sm mb-2">
                {hotel!.personName}
              </div>
              {hotel!.hotelName && (
                <div className="text-sm text-neutral-300 mb-2">
                  {hotel!.hotelName}
                </div>
              )}
              {(hotel!.checkIn || hotel!.checkOut) && (
                <div className="flex items-center gap-1 text-xs text-neutral-400 mb-1">
                  <Calendar className="w-3 h-3" />
                  {hotel!.checkIn && (
                    <span>
                      Check-in: {new Date(hotel!.checkIn).toLocaleDateString()}
                    </span>
                  )}
                  {hotel!.checkIn && hotel!.checkOut && (
                    <span className="mx-1">•</span>
                  )}
                  {hotel!.checkOut && (
                    <span>
                      Check-out:{" "}
                      {new Date(hotel!.checkOut).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
              {hotel!.address && (
                <div className="text-xs text-neutral-500">{hotel!.address}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <Popup
        title="Hotel"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-[720px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Handle add hotel logic here
            console.log("Adding hotel:", {
              hotelName,
              address,
              city,
              checkIn,
              checkOut,
              bookingRefs,
              notes,
              phone,
              email,
            });
            setIsOpen(false);
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Hotel Name
              </label>
              <Input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Enter hotel name"
                className="bg-card-cell! border-card-cell-border"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Booking References
              </label>
              <div className="space-y-2">
                {bookingRefs.map((ref, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={ref}
                      onChange={(e) => updateBookingRef(index, e.target.value)}
                      placeholder="Enter booking reference"
                      className="bg-card-cell! border-card-cell-border flex-1"
                    />
                    {bookingRefs.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeBookingRef(index)}
                        className="px-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addBookingRef}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add another reference
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Address
              </label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter hotel address"
                className="bg-card-cell! border-card-cell-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                City
              </label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
                className="bg-card-cell! border-card-cell-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Check-in Date & Time
              </label>
              <Input
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="bg-card-cell! border-card-cell-border"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Check-out Date & Time
              </label>
              <Input
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="bg-card-cell! border-card-cell-border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Phone Number
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="bg-card-cell! border-card-cell-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="bg-card-cell! border-card-cell-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write notes..."
              className="w-full min-h-[120px] p-3 rounded-md bg-card-cell! border border-card-cell-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" size="sm">
              Add Hotel
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
