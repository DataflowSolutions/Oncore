"use client";

import { Clock } from "lucide-react";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CateringPanelProps {
  advancingFields: Array<{ field_name: string; value: unknown }>;
}

export function CateringPanel({ advancingFields }: CateringPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTimeForm, setServiceTimeForm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [menuNotesForm, setMenuNotesForm] = useState("");
  const [bookingRefs, setBookingRefs] = useState<string[]>([""]);

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

  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium text-card-foreground font-header">
          Food
        </h3>
        <button
          onClick={() => setIsOpen(true)}
          className="text-button-bg hover:text-button-bg-hover cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {!company &&
      !serviceTime &&
      !menuNotes &&
      !guestCount &&
      !promoterCateringInfo ? (
        <div>
          <p className="text-sm text-neutral-400">
            No food information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Food details will be shown here
          </p>
        </div>
      ) : (
        <div>
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
      )}
      <Popup
        title="Food"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-[720px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Handle add catering logic here
            console.log("Adding catering:", {
              companyName,
              address,
              city,
              serviceDate,
              serviceTimeForm,
              phone,
              email,
              menuNotesForm,
              bookingRefs,
            });
            setIsOpen(false);
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Food Company
              </label>
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter catering company name"
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
                placeholder="Enter catering address"
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
                Service Date
              </label>
              <Input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="bg-card-cell! border-card-cell-border"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Service Time
              </label>
              <Input
                type="time"
                value={serviceTimeForm}
                onChange={(e) => setServiceTimeForm(e.target.value)}
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
              value={menuNotesForm}
              onChange={(e) => setMenuNotesForm(e.target.value)}
              placeholder="Write notes..."
              className="w-full min-h-[120px] p-3 rounded-md bg-card-cell! border border-card-cell-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" size="sm">
              Add Catering
            </Button>
          </div>
        </form>
      </Popup>
    </div>
  );
}
