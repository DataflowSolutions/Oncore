"use client";

import { Phone, Mail } from "lucide-react";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCatering } from "@/lib/actions/advancing";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItemsForShow,
} from "@/lib/actions/schedule";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/lib/database.types";

type AdvancingCatering = Database["public"]["Tables"]["advancing_catering"]["Row"];

interface CateringPanelProps {
  /** New format: catering data from advancing_catering table */
  cateringData?: AdvancingCatering[];
  /** Legacy format: advancing fields (for backward compatibility) */
  advancingFields?: Array<{ field_name: string; value: unknown }>;
  orgSlug: string;
  showId: string;
}

export function CateringPanel({
  cateringData = [],
  advancingFields = [],
  orgSlug,
  showId,
}: CateringPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTimeForm, setServiceTimeForm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [menuNotesForm, setMenuNotesForm] = useState("");
  const [bookingRefs, setBookingRefs] = useState<string[]>([""]);
  const [isSaving, setIsSaving] = useState(false);
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

  // Use new format first (from advancing_catering table), fall back to legacy format
  const firstCatering = cateringData[0];
  
  // Map new table format to display format
  const cateringInfo = firstCatering ? {
    name: firstCatering.provider_name || undefined,
    address: firstCatering.address || undefined,
    city: firstCatering.city || undefined,
    serviceDateTime: firstCatering.service_at || undefined,
    bookingRefs: firstCatering.booking_refs || undefined,
    notes: firstCatering.notes || undefined,
    phone: firstCatering.phone || undefined,
    email: firstCatering.email || undefined,
    guestCount: firstCatering.guest_count || undefined,
  } : (advancingFields.find((f) => f.field_name === "catering")?.value as
    | {
        name?: string;
        address?: string;
        city?: string;
        serviceDateTime?: string;
        bookingRefs?: string[];
        notes?: string;
        phone?: string;
        email?: string;
      }
    | undefined);

  // Check for old field format (fallback)
  const company =
    cateringInfo?.name ||
    (advancingFields.find((f) => f.field_name === "catering_company")?.value as
      | string
      | undefined) ||
    (advancingFields.find((f) => f.field_name === "promoter_catering")
      ?.value as string | undefined);
  const serviceTime =
    cateringInfo?.serviceDateTime ||
    (advancingFields.find((f) => f.field_name === "catering_serviceTime")
      ?.value as string | undefined);
  const menuNotes =
    cateringInfo?.notes ||
    (advancingFields.find((f) => f.field_name === "catering_menu")?.value as
      | string
      | undefined);
  const guestCount = advancingFields.find(
    (f) => f.field_name === "catering_guestCount"
  )?.value as string | number | undefined;

  // If we have promoter catering text, use it as general info
  const promoterCateringInfo = advancingFields.find(
    (f) => f.field_name === "promoter_catering"
  )?.value as string | undefined;

  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <div className="flex justify-between items-center mb-2">
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
      !promoterCateringInfo &&
      !cateringInfo ? (
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
          {cateringInfo && (
            <div
              className="cursor-pointer hover:opacity-50 transition-opacity flex flex-col gap-2"
              onClick={() => setIsDetailsOpen(true)}
            >
              {cateringInfo.serviceDateTime && (
                <div className="font-header text-xl text-center">
                  {new Date(cateringInfo.serviceDateTime).toLocaleTimeString(
                    "en-GB",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }
                  )}
                </div>
              )}
              {cateringInfo.name && (
                <div className="text-center text-xs font-header text-card-foreground">
                  {cateringInfo.name}
                </div>
              )}
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
          onSubmit={async (e) => {
            e.preventDefault();

            setIsSaving(true);

            try {
              // Combine date and time into ISO string
              const serviceDateTime =
                serviceDate && serviceTimeForm
                  ? `${serviceDate}T${serviceTimeForm}:00`
                  : "";

              // Save catering data using the new saveCatering function
              const cateringData = {
                name: companyName,
                address,
                city,
                serviceDateTime,
                bookingRefs: bookingRefs.filter((ref) => ref.trim()),
                notes: menuNotesForm,
                phone,
                email,
              };

              const result = await saveCatering(orgSlug, showId, cateringData);

              if (!result.success) {
                logger.error("Failed to save catering data", {
                  error: result.error,
                });
                throw new Error(result.error || "Failed to save catering data");
              }

              const cateringId = result.data?.id;

              // Delete existing auto-generated catering schedule items first
              const existingItems = await getScheduleItemsForShow(showId);
              const cateringItems = existingItems.filter(
                (item) => item.item_type === "catering" && item.auto_generated
              );

              for (const item of cateringItems) {
                await deleteScheduleItem(orgSlug, showId, item.id);
              }

              // Create schedule item for service time
              if (serviceDateTime) {
                const serviceStart = new Date(serviceDateTime);
                const serviceEnd = new Date(serviceStart);
                serviceEnd.setMinutes(serviceEnd.getMinutes()); // Add 15 minutes

                const serviceResult = await createScheduleItem(
                  orgSlug,
                  showId,
                  {
                    title: `Food Service - ${companyName}`,
                    starts_at: serviceStart.toISOString(),
                    ends_at: serviceEnd.toISOString(),
                    location:
                      address && city
                        ? `${address}, ${city}`
                        : address || city || companyName,
                    notes: `Service at ${companyName}`,
                    item_type: "catering",
                    auto_generated: true,
                    source_field_id: cateringId,
                  }
                );

                if (!serviceResult.success) {
                  logger.error("Failed to create catering schedule item", {
                    error: serviceResult.error,
                  });
                }
              }

              // Reset form
              setCompanyName("");
              setAddress("");
              setCity("");
              setServiceDate("");
              setServiceTimeForm("");
              setBookingRefs([""]);
              setMenuNotesForm("");
              setPhone("");
              setEmail("");
              setIsOpen(false);

              // Reload the page to show updated data
              window.location.reload();
            } catch (error) {
              logger.error("Error saving catering data", error);
            } finally {
              setIsSaving(false);
            }
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
                      className="flex-1"
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              value={menuNotesForm}
              onChange={(e) => setMenuNotesForm(e.target.value)}
              placeholder="Write notes..."
              className="w-full min-h-[120px] p-3 rounded-md bg-card-cell! border border-card-cell-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add Catering"}
            </Button>
          </div>
        </form>
      </Popup>

      {/* Catering Details Popup */}
      <Popup
        title="Food"
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        className="sm:max-w-[540px]"
      >
        <div className="space-y-6">
          {/* Company Name and Address */}
          <div>
            {cateringInfo?.name && (
              <div>
                <h3 className="text-xl font-header text-card-foreground mb-1">
                  {cateringInfo?.name}
                </h3>
              </div>
            )}
            <div className="flex justify-between">
              {(cateringInfo?.address || cateringInfo?.city) && (
                <div className="flex flex-col">
                  <p className="text-sm text-description-foreground">
                    {cateringInfo?.address}
                  </p>
                  <p className="text-sm text-description-foreground">
                    {cateringInfo?.city}
                  </p>
                </div>
              )}
              {/* Service Date & Time */}
              {cateringInfo?.serviceDateTime && (
                <div className="text-center">
                  <p className="text-sm text-description-foreground text-end">
                    {new Date(cateringInfo.serviceDateTime).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <p className="text-sm text-description-foreground text-end">
                    {new Date(cateringInfo.serviceDateTime).toLocaleTimeString(
                      "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="w-full h-[1px] bg-foreground/20 rounded-full" />

          {/* Booking References */}
          {cateringInfo?.bookingRefs && cateringInfo.bookingRefs.length > 0 && (
            <div>
              <h4 className="text-sm font-header text-card-foreground mb-2">
                Booking Reference
              </h4>
              <div className="space-y-1">
                {cateringInfo.bookingRefs.map((ref, idx) => (
                  <p key={idx} className="text-sm text-description-foreground">
                    {ref}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="w-full h-[1px] bg-foreground/20 rounded-full" />
          {/* Notes */}
          {cateringInfo?.notes && (
            <div className="">
              <h4 className="text-sm font-header text-card-foreground mb-2">
                Notes
              </h4>
              <p className="text-sm text-description-foreground whitespace-pre-wrap">
                {cateringInfo.notes}
              </p>
            </div>
          )}

          {/* Contact Information */}
          {(cateringInfo?.phone || cateringInfo?.email) && (
            <div className="space-y-3 pt-4 ">
              {cateringInfo.phone && (
                <div className="flex items-center gap-3 py-2 px-4 bg-card-cell justify-between rounded-full">
                  <span className="text-sm text-card-foreground">
                    {cateringInfo.phone}
                  </span>
                  <Link
                    className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7"
                    title={`Call ${cateringInfo.phone}`}
                    href={`tel:${cateringInfo.phone}`}
                  >
                    <Phone
                      size={16}
                      className="inline-block text-card-foreground hover:text-neutral-400 cursor-pointer"
                    />
                  </Link>
                </div>
              )}
              {cateringInfo.email && (
                <div className="flex items-center gap-3 py-2 px-4 bg-card-cell justify-between rounded-full">
                  <span className="text-sm text-card-foreground">
                    {cateringInfo.email}
                  </span>
                  <Link
                    className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7"
                    title={`Email ${cateringInfo.email}`}
                    href={`mailto:${cateringInfo.email}`}
                  >
                    <Mail
                      size={16}
                      className="inline-block text-card-foreground hover:text-neutral-400 cursor-pointer"
                    />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </Popup>
    </div>
  );
}
