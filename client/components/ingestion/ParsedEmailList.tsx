"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  confirmParsedEmail,
  rejectParsedEmail,
} from "@/lib/actions/email";
import type { Database } from "@/lib/database.types";
import type {
  ParsedContact,
  ParsedShowDetails,
  ParsedVenueDetails,
} from "@/lib/services/email-parser";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusLabels: Record<ParsedEmailRow["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "Pending review", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
};

type ParsedEmailRow = Database["public"]["Tables"]["parsed_emails"]["Row"];
type VenueRow = Database["public"]["Tables"]["venues"]["Row"];

type ParsedEmailPayload = {
  showDetails?: ParsedShowDetails | null;
  venueDetails?: ParsedVenueDetails | null;
  contacts?: ParsedContact[] | null;
  rawContent?: string;
};

interface ParsedEmailListProps {
  orgId: string;
  orgSlug: string;
  emails: ParsedEmailRow[];
  venues: VenueRow[];
}

export function ParsedEmailList({ orgId, orgSlug, emails, venues }: ParsedEmailListProps) {
  const pending = useMemo(
    () => emails.filter((email) => email.status === "pending_review"),
    [emails],
  );
  const processed = useMemo(
    () => emails.filter((email) => email.status !== "pending_review"),
    [emails],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Emails awaiting review</h2>
            <p className="text-sm text-muted-foreground">
              Confirm new shows directly from forwarded offers.
            </p>
          </div>
          <Badge variant="secondary">{pending.length} pending</Badge>
        </header>
        <div className="space-y-4">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No emails awaiting review. Forward offers to your ingestion inbox to get started.
              </CardContent>
            </Card>
          ) : (
            pending.map((email) => (
              <ParsedEmailItem
                key={email.id}
                email={email}
                venues={venues}
                orgId={orgId}
              />
            ))
          )}
        </div>
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Reviewed emails</h2>
            <p className="text-sm text-muted-foreground">
              Recent decisions and their resulting shows.
            </p>
          </div>
          <Badge variant="outline">{processed.length}</Badge>
        </header>
        <div className="space-y-4">
          {processed.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No reviewed emails yet.
              </CardContent>
            </Card>
          ) : (
            processed.map((email) => (
              <ReviewedEmailCard key={email.id} email={email} orgSlug={orgSlug} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewedEmailCard({
  email,
  orgSlug,
}: {
  email: ParsedEmailRow;
  orgSlug: string;
}) {
  const parsed = (email.parsed_data as ParsedEmailPayload | null) ?? undefined;
  const show = parsed?.showDetails;
  const venue = parsed?.venueDetails;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            {email.subject || "(No subject)"}
          </CardTitle>
          <CardDescription className="text-xs">
            {format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")} • {email.from_email || "Unknown sender"}
          </CardDescription>
        </div>
        <Badge variant={statusLabels[email.status].variant}>
          {statusLabels[email.status].label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {email.status === "failed" && email.error ? (
          <p className="text-destructive">{email.error}</p>
        ) : null}
        {show?.title ? (
          <div>
            <p className="font-medium">{show.title}</p>
            <p className="text-muted-foreground">
              {show.date || "Date TBD"}
              {venue?.name ? ` • ${venue.name}` : ""}
            </p>
          </div>
        ) : null}
        {email.show_id ? (
          <Button asChild size="sm" variant="outline">
            <a href={`/${orgSlug}/shows/${email.show_id}`}>View show</a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ParsedEmailItem({
  email,
  venues,
  orgId,
}: {
  email: ParsedEmailRow;
  venues: VenueRow[];
  orgId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const parsed = (email.parsed_data as ParsedEmailPayload | null) ?? undefined;
  const show = parsed?.showDetails ?? undefined;
  const venueDetails = parsed?.venueDetails ?? undefined;
  const [title, setTitle] = useState(show?.title ?? "");
  const [date, setDate] = useState(show?.date ?? "");
  const [notes, setNotes] = useState("");
  const [fee, setFee] = useState(show?.fee ?? "");
  const defaultVenue = venues[0]?.id ?? "create";
  const [venueOption, setVenueOption] = useState<string>(
    venueDetails?.name ? "create" : defaultVenue,
  );
  const [newVenue, setNewVenue] = useState({
    name: venueDetails?.name ?? "",
    address: venueDetails?.address ?? "",
    city: venueDetails?.city ?? "",
    state: venueDetails?.state ?? "",
    capacity: venueDetails?.capacity ? String(venueDetails.capacity) : "",
  });
  const [rejectReason, setRejectReason] = useState("");

  const handleConfirm = () => {
    if (!title.trim()) {
      toast.error("Show title is required");
      return;
    }

    if (!date) {
      toast.error("Show date is required");
      return;
    }

    const useNewVenue = venueOption === "create";
    if (useNewVenue && !newVenue.name.trim()) {
      toast.error("Venue name is required to create a new venue");
      return;
    }

    startTransition(async () => {
      const result = await confirmParsedEmail({
        emailId: email.id,
        showData: {
          title: title.trim(),
          date,
          venueId: !useNewVenue && venueOption ? venueOption : undefined,
          notes: notes.trim() || undefined,
          fee: fee.trim() || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        createVenue: useNewVenue,
        venueData: useNewVenue
          ? {
              name: newVenue.name.trim(),
              address: newVenue.address.trim() || undefined,
              city: newVenue.city.trim() || undefined,
              state: newVenue.state.trim() || undefined,
              capacity: (() => {
                const parsedCapacity = Number.parseInt(newVenue.capacity, 10);
                return Number.isNaN(parsedCapacity) ? undefined : parsedCapacity;
              })(),
            }
          : undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to confirm email");
        return;
      }

      toast.success("Show created from email");
      router.refresh();
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectParsedEmail({
        emailId: email.id,
        orgId,
        reason: rejectReason.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to reject email");
        return;
      }

      toast.success("Email marked as rejected");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            {email.subject || "(No subject)"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {format(new Date(email.created_at), "MMM d, yyyy 'at' h:mm a")} • {email.from_email || "Unknown sender"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusLabels[email.status].variant}>
            {statusLabels[email.status].label}
          </Badge>
          {typeof email.confidence === "number" ? (
            <Badge variant="outline">Confidence {(email.confidence * 100).toFixed(0)}%</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {email.error ? (
          <p className="text-sm text-destructive">{email.error}</p>
        ) : null}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="parsed-details">
            <AccordionTrigger>Suggested details</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailGroup title="Show details">
                  <Detail label="Title" value={show?.title} />
                  <Detail label="Date" value={show?.date} />
                  <Detail label="Time" value={show?.time} />
                  <Detail label="Fee" value={show?.fee} />
                  <Detail label="Guarantee" value={show?.guarantee} />
                </DetailGroup>
                <DetailGroup title="Venue">
                  <Detail label="Name" value={venueDetails?.name} />
                  <Detail label="Location" value={[venueDetails?.city, venueDetails?.state].filter(Boolean).join(", ")} />
                  <Detail label="Address" value={venueDetails?.address} />
                  <Detail label="Capacity" value={venueDetails?.capacity?.toString()} />
                </DetailGroup>
              </div>

              {parsed?.contacts && parsed.contacts.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Contacts</h4>
                  <ul className="space-y-1 text-sm">
                    {parsed.contacts.map((contact, index) => (
                      <li key={`${contact.email ?? contact.name ?? index}`} className="flex flex-col">
                        <span className="font-medium">{contact.name ?? "Unknown"}</span>
                        <span className="text-muted-foreground">
                          {[contact.email, contact.phone, contact.role].filter(Boolean).join(" • ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="raw-email">
            <AccordionTrigger>Original email</AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="max-h-64 rounded-md border">
                <pre className="whitespace-pre-wrap break-words p-4 text-xs">
                  {email.raw_content ?? "No raw content stored."}
                </pre>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${email.id}-title`}>Show title</Label>
              <Input
                id={`${email.id}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Show title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${email.id}-date`}>Show date</Label>
              <Input
                id={`${email.id}-date`}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${email.id}-fee`}>Fee / offer</Label>
              <Input
                id={`${email.id}-fee`}
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                placeholder="$2,500 guarantee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${email.id}-notes`}>Notes</Label>
              <Textarea
                id={`${email.id}-notes`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Venue</Label>
            <Select
              value={venueOption}
              onValueChange={(value) => setVenueOption(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                    {venue.city ? ` • ${venue.city}` : ""}
                  </SelectItem>
                ))}
                <SelectItem value="create">Create new venue</SelectItem>
              </SelectContent>
            </Select>

            {venueOption === "create" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`${email.id}-venue-name`}>Venue name</Label>
                  <Input
                    id={`${email.id}-venue-name`}
                    value={newVenue.name}
                    onChange={(event) =>
                      setNewVenue((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Example Arena"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${email.id}-venue-address`}>Address</Label>
                  <Input
                    id={`${email.id}-venue-address`}
                    value={newVenue.address}
                    onChange={(event) =>
                      setNewVenue((prev) => ({ ...prev, address: event.target.value }))
                    }
                    placeholder="123 Main St"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${email.id}-venue-city`}>City</Label>
                  <Input
                    id={`${email.id}-venue-city`}
                    value={newVenue.city}
                    onChange={(event) =>
                      setNewVenue((prev) => ({ ...prev, city: event.target.value }))
                    }
                    placeholder="Chicago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${email.id}-venue-state`}>State</Label>
                  <Input
                    id={`${email.id}-venue-state`}
                    value={newVenue.state}
                    onChange={(event) =>
                      setNewVenue((prev) => ({ ...prev, state: event.target.value }))
                    }
                    placeholder="IL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${email.id}-venue-capacity`}>Capacity</Label>
                  <Input
                    id={`${email.id}-venue-capacity`}
                    value={newVenue.capacity}
                    onChange={(event) =>
                      setNewVenue((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                    placeholder="2000"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${email.id}-reject-reason`}>Rejection reason (optional)</Label>
            <Textarea
              id={`${email.id}-reject-reason`}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={2}
              placeholder="Why is this email being rejected?"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Processing…" : "Create show"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReject}
              disabled={isPending}
            >
              Reject email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="space-y-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <p>
      <span className="font-medium text-foreground">{label}: </span>
      <span>{value}</span>
    </p>
  );
}
