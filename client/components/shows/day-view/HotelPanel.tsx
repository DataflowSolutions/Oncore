"use client";

import { Calendar, Phone, Mail } from "lucide-react";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableText } from "@/components/ui/editable-text";
import { saveLodging } from "@/lib/actions/advancing";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItemsForShow,
} from "@/lib/actions/schedule";
import { logger } from "@/lib/logger";
import { cn, formatDate, formatTime } from "@/lib/utils";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import type { LodgingData } from "@/lib/actions/advancing/lodging";
import type { Database } from "@/lib/database.types";

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

type AdvancingLodging =
  Database["public"]["Tables"]["advancing_lodging"]["Row"];

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
  orgSlug: string;
  showId: string;
  lodgingData?: AdvancingLodging[];
}

export function HotelPanel({
  advancingFields,
  assignedPeople,
  orgSlug,
  showId,
  lodgingData = [],
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const derivedPrimaryLodging = useMemo(
    () => lodgingData.find((l) => !l.person_id) || lodgingData[0] || null,
    [lodgingData]
  );
  const [primaryLodging, setPrimaryLodging] = useState<AdvancingLodging | null>(
    derivedPrimaryLodging
  );

  useEffect(() => {
    setPrimaryLodging(derivedPrimaryLodging);
  }, [derivedPrimaryLodging]);

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

  // Convert lodging data to the format expected by the UI
  const hotelInfo = primaryLodging
    ? {
        name: primaryLodging.hotel_name || undefined,
        address: primaryLodging.address || undefined,
        city: primaryLodging.city || undefined,
        checkIn: primaryLodging.check_in_at || undefined,
        checkOut: primaryLodging.check_out_at || undefined,
        bookingRefs: primaryLodging.booking_refs || undefined,
        notes: primaryLodging.notes || undefined,
        phone: primaryLodging.phone || undefined,
        email: primaryLodging.email || undefined,
      }
    : undefined;

  // Check for promoter accommodation general info (legacy fallback)
  const promoterAccommodation = advancingFields.find(
    (f) => f.field_name === "promoter_accommodation"
  )?.value as string | undefined;

  // Extract hotel information for assigned people (from lodgingData)
  const hotelData = lodgingData
    .filter((l) => l.person_id)
    .map((lodging) => {
      const person = assignedPeople.find(
        (p) => p.person_id === lodging.person_id
      );
      if (!person?.people) return null;

      return {
        personName: person.people.name,
        hotelName: lodging.hotel_name,
        checkIn: lodging.check_in_at,
        checkOut: lodging.check_out_at,
        address: lodging.address,
      };
    })
    .filter(Boolean);

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

  const buildPayloadFromRecord = (
    record: AdvancingLodging | null
  ): LodgingData => ({
    name: record?.hotel_name ?? undefined,
    address: record?.address ?? undefined,
    city: record?.city ?? undefined,
    checkIn: record?.check_in_at ?? undefined,
    checkOut: record?.check_out_at ?? undefined,
    bookingRefs: record?.booking_refs ?? undefined,
    phone: record?.phone ?? undefined,
    email: record?.email ?? undefined,
    notes: record?.notes ?? undefined,
  });

  const persistHotelUpdate = async (updates: Partial<LodgingData>) => {
    const basePayload = buildPayloadFromRecord(primaryLodging);
    const payload: LodgingData = {
      ...basePayload,
      ...updates,
    };

    const result = await saveLodging(orgSlug, showId, payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to save hotel data");
    }
    setPrimaryLodging(result.data);
  };

  const currentBookingRefs = primaryLodging?.booking_refs ?? [];

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

      {hotelData.length === 0 && !promoterAccommodation && !hotelInfo ? (
        <div>
          <p className="text-sm text-neutral-400">
            No hotel information available
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Hotel details will be shown here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show general hotel info if available */}
          {hotelInfo && (
            <div
              className="flex flex-col gap-4 cursor-pointer hover:opacity-50 transition-opacity"
              onClick={() => setIsDetailsOpen(true)}
            >
              {/* Hotel Name centered */}

              {/* Check-in and Check-out in two columns */}
              {(hotelInfo.checkIn || hotelInfo.checkOut) && (
                <div className="flex gap-4 justify-between">
                  {/* Check-in */}
                  <div className="text-left">
                    <div className="text-sm text-description-foreground font-bold mb-1">
                      <span>Check-in</span>
                    </div>
                    {hotelInfo.checkIn && (
                      <>
                        <div className="text-base text-description-foreground">
                          <span>
                            {" "}
                            {formatDate(hotelInfo.checkIn, { format: "date" })}
                          </span>
                        </div>
                        <div className="text-base text-description-foreground">
                          <span> {formatTime(hotelInfo.checkIn)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-neutral-700"></div>
                  </div>

                  {/* Check-out */}
                  <div className="text-right -ml-4">
                    <div className="text-sm text-description-foreground font-bold mb-1">
                      <span>Check-out</span>
                    </div>
                    {hotelInfo.checkOut && (
                      <>
                        <div className="text-base text-description-foreground">
                          <span>
                            {formatDate(hotelInfo.checkOut, { format: "date" })}
                          </span>
                        </div>
                        <div className="text-base text-description-foreground">
                          <span>{formatTime(hotelInfo.checkOut)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {hotelInfo.name && (
                <div className="text-center text-lg font-header text-card-foreground">
                  {hotelInfo.name}
                </div>
              )}
            </div>
          )}

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
                      Check-in:{" "}
                      {formatDate(hotel!.checkIn, { format: "short-date" })}
                    </span>
                  )}
                  {hotel!.checkIn && hotel!.checkOut && (
                    <span className="mx-1">•</span>
                  )}
                  {hotel!.checkOut && (
                    <span>
                      Check-out:{" "}
                      {formatDate(hotel!.checkOut, { format: "short-date" })}
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
          onSubmit={async (e) => {
            e.preventDefault();

            setIsSaving(true);

            try {
              // Save all hotel data using the new lodging table
              const hotelData = {
                name: hotelName,
                address,
                city,
                checkIn,
                checkOut,
                bookingRefs: bookingRefs.filter((ref) => ref.trim()),
                notes,
                phone,
                email,
              };

              const result = await saveLodging(orgSlug, showId, hotelData);

              if (!result.success) {
                logger.error("Failed to save hotel data", {
                  error: result.error,
                });
                throw new Error(result.error || "Failed to save hotel data");
              }

              const lodgingId = result.data?.id;

              // Delete existing auto-generated hotel schedule items first
              const existingItems = await getScheduleItemsForShow(showId);
              const hotelItems = existingItems.filter(
                (item) => item.item_type === "hotel" && item.auto_generated
              );

              for (const item of hotelItems) {
                await deleteScheduleItem(orgSlug, showId, item.id);
              }

              // Create schedule items for check-in and check-out
              if (checkIn) {
                const checkInDate = new Date(checkIn);
                const checkInEnd = new Date(checkInDate);
                checkInEnd.setMinutes(checkInEnd.getMinutes() + 15); // Add 15 minutes

                const checkInResult = await createScheduleItem(
                  orgSlug,
                  showId,
                  {
                    title: `Hotel Check-in - ${hotelName}`,
                    starts_at: checkInDate.toISOString(),
                    ends_at: checkInEnd.toISOString(),
                    location:
                      address && city
                        ? `${address}, ${city}`
                        : address || city || hotelName,
                    notes: `Check-in at ${hotelName}`,
                    item_type: "hotel",
                    auto_generated: true,
                  }
                );

                if (!checkInResult.success) {
                  logger.error("Failed to create check-in schedule item", {
                    error: checkInResult.error,
                  });
                }
              }

              if (checkOut) {
                const checkOutDate = new Date(checkOut);
                const checkOutEnd = new Date(checkOutDate);
                checkOutEnd.setMinutes(checkOutEnd.getMinutes() + 15); // Add 15 minutes

                const checkOutResult = await createScheduleItem(
                  orgSlug,
                  showId,
                  {
                    title: `Hotel Check-out - ${hotelName}`,
                    starts_at: checkOutDate.toISOString(),
                    ends_at: checkOutEnd.toISOString(),
                    location:
                      address && city
                        ? `${address}, ${city}`
                        : address || city || hotelName,
                    notes: `Check-out from ${hotelName}`,
                    item_type: "hotel",
                    auto_generated: true,
                  }
                );

                if (!checkOutResult.success) {
                  logger.error("Failed to create check-out schedule item", {
                    error: checkOutResult.error,
                  });
                }
              }

              // Reset form
              setHotelName("");
              setAddress("");
              setCity("");
              setCheckIn("");
              setCheckOut("");
              setBookingRefs([""]);
              setNotes("");
              setPhone("");
              setEmail("");
              setIsOpen(false);

              // Reload the page to show updated data
              window.location.reload();
            } catch (error) {
              logger.error("Error saving hotel data", error);
            } finally {
              setIsSaving(false);
            }
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
                placeholder="Enter hotel address"
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
                Check-in Date & Time
              </label>
              <Input
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write notes..."
              className="w-full min-h-[120px] p-3 rounded-md bg-card-cell! border border-card-cell-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add Hotel"}
            </Button>
          </div>
        </form>
      </Popup>

      {/* Hotel Details Popup */}
      <Popup
        title="Hotel"
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        className="sm:max-w-[540px]"
      >
        <div className="space-y-6">
          {primaryLodging && (
            <div className="space-y-2">
              <EditableText
                value={primaryLodging.hotel_name ?? ""}
                displayValue={primaryLodging.hotel_name || "Add hotel name"}
                placeholder="Add hotel name"
                className={cn(
                  inlineEditButtonClasses,
                  "text-xl font-header text-card-foreground"
                )}
                inputClassName="text-xl font-header"
                onSave={(value) =>
                  persistHotelUpdate({ name: sanitizeText(value) })
                }
              />
              <div className="flex flex-col gap-1">
                <EditableText
                  value={primaryLodging.address ?? ""}
                  displayValue={primaryLodging.address || "Add address"}
                  placeholder="Add address"
                  className={cn(
                    inlineEditButtonClasses,
                    "text-sm text-description-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  onSave={(value) =>
                    persistHotelUpdate({ address: sanitizeText(value) })
                  }
                />
                <EditableText
                  value={primaryLodging.city ?? ""}
                  displayValue={primaryLodging.city || "Add city"}
                  placeholder="Add city"
                  className={cn(
                    inlineEditButtonClasses,
                    "text-sm text-description-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  onSave={(value) =>
                    persistHotelUpdate({ city: sanitizeText(value) })
                  }
                />
              </div>
            </div>
          )}

          {(primaryLodging || hotelInfo?.checkIn || hotelInfo?.checkOut) && (
            <div className="bg-card-cell rounded-lg p-4">
              <div className="flex justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="text-sm text-description-foreground font-header">
                    Check-in
                  </div>
                  <EditableText
                    value={toLocalDateTimeValue(primaryLodging?.check_in_at)}
                    displayValue={
                      primaryLodging?.check_in_at
                        ? `${formatDate(primaryLodging.check_in_at, {
                            format: "date",
                          })} · ${formatTime(primaryLodging.check_in_at)}`
                        : "Add check-in"
                    }
                    placeholder="Set check-in"
                    inputType="datetime-local"
                    className={cn(
                      inlineEditButtonClasses,
                      "text-base text-card-foreground text-left"
                    )}
                    inputClassName="text-base"
                    onSave={(value) =>
                      persistHotelUpdate({
                        checkIn: toIsoOrUndefined(value),
                      })
                    }
                  />
                </div>
                <div className="w-px bg-neutral-700" />
                <div className="flex flex-col gap-1 flex-1 text-right">
                  <div className="text-sm text-description-foreground font-header">
                    Check-out
                  </div>
                  <EditableText
                    value={toLocalDateTimeValue(primaryLodging?.check_out_at)}
                    displayValue={
                      primaryLodging?.check_out_at
                        ? `${formatDate(primaryLodging.check_out_at, {
                            format: "date",
                          })} · ${formatTime(primaryLodging.check_out_at)}`
                        : "Add check-out"
                    }
                    placeholder="Set check-out"
                    inputType="datetime-local"
                    className={cn(
                      inlineEditButtonClasses,
                      "text-base text-card-foreground text-right"
                    )}
                    inputClassName="text-base"
                    onSave={(value) =>
                      persistHotelUpdate({
                        checkOut: toIsoOrUndefined(value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {(primaryLodging || currentBookingRefs.length > 0) && (
            <div>
              <h4 className="text-sm font-header text-card-foreground mb-2">
                Booking Reference
              </h4>
              <div className="space-y-1">
                {(currentBookingRefs.length ? currentBookingRefs : [""]).map(
                  (ref, idx) => (
                    <EditableText
                      key={`${idx}-${ref}`}
                      value={ref ?? ""}
                      displayValue={ref || "Add booking reference"}
                      placeholder="Add booking reference"
                      className={cn(
                        inlineEditButtonClasses,
                        "text-sm text-description-foreground text-left"
                      )}
                      inputClassName="text-sm"
                      onSave={(value) => {
                        const sanitized = sanitizeText(value);
                        const nextRefs = [...currentBookingRefs];
                        if (sanitized) {
                          if (idx < nextRefs.length) {
                            nextRefs[idx] = sanitized;
                          } else {
                            nextRefs.push(sanitized);
                          }
                        } else if (idx < nextRefs.length) {
                          nextRefs.splice(idx, 1);
                        }
                        return persistHotelUpdate({
                          bookingRefs: nextRefs.length ? nextRefs : undefined,
                        });
                      }}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {primaryLodging && (
            <div>
              <h4 className="text-sm font-header text-card-foreground mb-2">
                Notes
              </h4>
              <EditableText
                value={primaryLodging.notes ?? ""}
                displayValue={primaryLodging.notes || "Add notes"}
                placeholder="Add notes"
                multiline
                className={cn(
                  inlineEditButtonClasses,
                  "text-sm text-description-foreground text-left"
                )}
                inputClassName="text-sm"
                onSave={(value) => {
                  const trimmed = value.trim();
                  return persistHotelUpdate({
                    notes: trimmed.length ? value : undefined,
                  });
                }}
              />
            </div>
          )}

          {primaryLodging && (
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <div className="flex items-center gap-3 py-2 px-4 bg-card-cell justify-between rounded-full">
                <EditableText
                  value={primaryLodging.phone ?? ""}
                  displayValue={primaryLodging.phone || "Add phone number"}
                  placeholder="Add phone number"
                  className={cn(
                    inlineEditButtonClasses,
                    "flex-1 text-sm text-card-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  onSave={(value) =>
                    persistHotelUpdate({ phone: sanitizeText(value) })
                  }
                />
                {primaryLodging.phone && (
                  <Link
                    className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7"
                    title={`Call ${primaryLodging.phone}`}
                    href={`tel:${primaryLodging.phone}`}
                  >
                    <Phone
                      size={16}
                      className="inline-block text-card-foreground hover:text-neutral-400 cursor-pointer"
                    />
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3 py-2 px-4 bg-card-cell justify-between rounded-full">
                <EditableText
                  value={primaryLodging.email ?? ""}
                  displayValue={primaryLodging.email || "Add email"}
                  placeholder="Add email"
                  className={cn(
                    inlineEditButtonClasses,
                    "flex-1 text-sm text-card-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  inputType="email"
                  onSave={(value) =>
                    persistHotelUpdate({ email: sanitizeText(value) })
                  }
                />
                {primaryLodging.email && (
                  <Link
                    title={`Email ${primaryLodging.email}`}
                    href={`mailto:${primaryLodging.email}`}
                    className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7"
                  >
                    <Mail
                      size={16}
                      className="inline-block text-card-foreground hover:text-neutral-400 cursor-pointer"
                    />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </Popup>
    </div>
  );
}
