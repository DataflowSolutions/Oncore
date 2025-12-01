"use client";

import { Phone, Mail } from "lucide-react";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableText } from "@/components/ui/editable-text";
import { saveCatering } from "@/lib/actions/advancing";
import {
  createScheduleItem,
  deleteScheduleItem,
  getScheduleItemsForShow,
} from "@/lib/actions/schedule";
import { logger } from "@/lib/logger";
import { cn, formatDate, formatTime } from "@/lib/utils";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/lib/database.types";
import type { CateringData } from "@/lib/actions/advancing/catering";

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

type AdvancingCatering =
  Database["public"]["Tables"]["advancing_catering"]["Row"];

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
  const derivedCatering = useMemo(
    () => cateringData[0] || null,
    [cateringData]
  );
  const [currentCatering, setCurrentCatering] =
    useState<AdvancingCatering | null>(derivedCatering);

  useEffect(() => {
    setCurrentCatering(derivedCatering);
  }, [derivedCatering]);
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

  // Map new table format to display format
  const cateringInfo = currentCatering
    ? {
        name: currentCatering.provider_name || undefined,
        address: currentCatering.address || undefined,
        city: currentCatering.city || undefined,
        serviceDateTime: currentCatering.service_at || undefined,
        bookingRefs: currentCatering.booking_refs || undefined,
        notes: currentCatering.notes || undefined,
        phone: currentCatering.phone || undefined,
        email: currentCatering.email || undefined,
        guestCount: currentCatering.guest_count || undefined,
      }
    : (advancingFields.find((f) => f.field_name === "catering")?.value as
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

  const buildPayloadFromRecord = (): CateringData => ({
    name: cateringInfo?.name ?? undefined,
    address: cateringInfo?.address ?? undefined,
    city: cateringInfo?.city ?? undefined,
    serviceDateTime: cateringInfo?.serviceDateTime ?? undefined,
    bookingRefs: cateringInfo?.bookingRefs ?? undefined,
    notes: cateringInfo?.notes ?? undefined,
    phone: cateringInfo?.phone ?? undefined,
    email: cateringInfo?.email ?? undefined,
  });

  const persistCateringUpdate = async (updates: Partial<CateringData>) => {
    const payload: CateringData = {
      ...buildPayloadFromRecord(),
      ...updates,
    };

    const result = await saveCatering(
      orgSlug,
      showId,
      payload,
      currentCatering?.id
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to save catering data");
    }

    setCurrentCatering(result.data);
  };

  const currentBookingRefs =
    currentCatering?.booking_refs ?? cateringInfo?.bookingRefs ?? [];

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
                  {formatTime(cateringInfo.serviceDateTime)}
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
          {(currentCatering || cateringInfo) && (
            <div className="space-y-3">
              <EditableText
                value={
                  currentCatering?.provider_name ?? cateringInfo?.name ?? ""
                }
                displayValue={cateringInfo?.name || "Add food provider"}
                placeholder="Add food provider"
                className={cn(
                  inlineEditButtonClasses,
                  "text-xl font-header text-card-foreground"
                )}
                inputClassName="text-xl font-header"
                onSave={(value) =>
                  persistCateringUpdate({ name: sanitizeText(value) })
                }
              />
              <div className="flex justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <EditableText
                    value={
                      currentCatering?.address ?? cateringInfo?.address ?? ""
                    }
                    displayValue={cateringInfo?.address || "Add address"}
                    placeholder="Add address"
                    className={cn(
                      inlineEditButtonClasses,
                      "text-sm text-description-foreground text-left"
                    )}
                    inputClassName="text-sm"
                    onSave={(value) =>
                      persistCateringUpdate({ address: sanitizeText(value) })
                    }
                  />
                  <EditableText
                    value={currentCatering?.city ?? cateringInfo?.city ?? ""}
                    displayValue={cateringInfo?.city || "Add city"}
                    placeholder="Add city"
                    className={cn(
                      inlineEditButtonClasses,
                      "text-sm text-description-foreground text-left"
                    )}
                    inputClassName="text-sm"
                    onSave={(value) =>
                      persistCateringUpdate({ city: sanitizeText(value) })
                    }
                  />
                </div>
                <div className="text-right">
                  <EditableText
                    value={toLocalDateTimeValue(
                      currentCatering?.service_at ||
                        cateringInfo?.serviceDateTime
                    )}
                    displayValue={
                      cateringInfo?.serviceDateTime
                        ? `${formatDate(cateringInfo.serviceDateTime, {
                            format: "date",
                          })} · ${formatTime(cateringInfo.serviceDateTime)}`
                        : "Add service time"
                    }
                    placeholder="Set service time"
                    inputType="datetime-local"
                    className={cn(
                      inlineEditButtonClasses,
                      "text-sm text-description-foreground text-right"
                    )}
                    inputClassName="text-sm"
                    onSave={(value) =>
                      persistCateringUpdate({
                        serviceDateTime: toIsoOrUndefined(value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {(currentCatering || currentBookingRefs.length > 0) && (
            <>
              <div className="w-full h-[1px] bg-foreground/20 rounded-full" />
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
                          return persistCateringUpdate({
                            bookingRefs: nextRefs.length ? nextRefs : undefined,
                          });
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            </>
          )}

          {(currentCatering || cateringInfo?.notes) && (
            <>
              <div className="w-full h-[1px] bg-foreground/20 rounded-full" />
              <div>
                <h4 className="text-sm font-header text-card-foreground mb-2">
                  Notes
                </h4>
                <EditableText
                  value={currentCatering?.notes ?? cateringInfo?.notes ?? ""}
                  displayValue={cateringInfo?.notes || "Add notes"}
                  placeholder="Add notes"
                  multiline
                  className={cn(
                    inlineEditButtonClasses,
                    "text-sm text-description-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  onSave={(value) => {
                    const trimmed = value.trim();
                    return persistCateringUpdate({
                      notes: trimmed.length ? value : undefined,
                    });
                  }}
                />
              </div>
            </>
          )}

          {(currentCatering || cateringInfo?.phone || cateringInfo?.email) && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 py-2 px-4 bg-card-cell justify-between rounded-full">
                <EditableText
                  value={currentCatering?.phone ?? cateringInfo?.phone ?? ""}
                  displayValue={cateringInfo?.phone || "Add phone number"}
                  placeholder="Add phone number"
                  className={cn(
                    inlineEditButtonClasses,
                    "flex-1 text-sm text-card-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  onSave={(value) =>
                    persistCateringUpdate({ phone: sanitizeText(value) })
                  }
                />
                {(currentCatering?.phone || cateringInfo?.phone) && (
                  <Link
                    className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7"
                    title={`Call ${
                      cateringInfo?.phone || currentCatering?.phone
                    }`}
                    href={`tel:${
                      cateringInfo?.phone || currentCatering?.phone
                    }`}
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
                  value={currentCatering?.email ?? cateringInfo?.email ?? ""}
                  displayValue={cateringInfo?.email || "Add email"}
                  placeholder="Add email"
                  className={cn(
                    inlineEditButtonClasses,
                    "flex-1 text-sm text-card-foreground text-left"
                  )}
                  inputClassName="text-sm"
                  inputType="email"
                  onSave={(value) =>
                    persistCateringUpdate({ email: sanitizeText(value) })
                  }
                />
                {(currentCatering?.email || cateringInfo?.email) && (
                  <Link
                    className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-7"
                    title={`Email ${
                      cateringInfo?.email || currentCatering?.email
                    }`}
                    href={`mailto:${
                      cateringInfo?.email || currentCatering?.email
                    }`}
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
