"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  FileType2,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

interface ImportDataButtonProps {
  orgId: string;
}

type StructuredField = {
  value: string | null;
  confidence: number;
};

type StructuredGig = {
  core: {
    date: StructuredField;
    city: StructuredField;
    venue: StructuredField;
    event: StructuredField;
    promoter: StructuredField;
    artist: StructuredField;
  };
  deal: {
    fee: StructuredField;
    dealType: StructuredField;
    currency: StructuredField;
    paymentTerms: StructuredField;
  };
  hospitalityLogistics: {
    hotel: StructuredField;
    transport: StructuredField;
    catering: StructuredField;
    soundcheck: StructuredField;
    setTime: StructuredField;
  };
  tech: {
    equipment: StructuredField;
    backline: StructuredField;
    stage: StructuredField;
    light: StructuredField;
    sound: StructuredField;
  };
  travel: {
    flights: StructuredField;
    times: StructuredField;
    airportCodes: StructuredField;
  };
};

type DuplicateCandidate = {
  id: string;
  title: string | null;
  date: string | null;
  venue: string | null;
  city: string | null;
  score: number;
};

type ImportJob = {
  status: "processing" | "needs_review" | "completed";
  rawText: string;
  structured: StructuredGig;
  duplicates: DuplicateCandidate[];
  source: "file" | "text";
  metadata?: {
    name: string;
    type: string;
    size: number;
  };
  warnings?: string[];
};

type ReviewFormState = {
  title: string;
  date: string;
  city: string;
  venueName: string;
  setTime: string;
  notes: string;
};

export default function ImportDataButton({ orgId }: ImportDataButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [job, setJob] = useState<ImportJob | null>(null);
  const [formValues, setFormValues] = useState<ReviewFormState>({
    title: "",
    date: "",
    city: "",
    venueName: "",
    setTime: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasDuplicates = job?.duplicates?.length ? job.duplicates.length > 0 : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xlsx",
      ".xls",
      ".csv",
      ".txt",
    ];
    const lower = selectedFile.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => lower.endsWith(ext));

    if (!isAllowed) {
      setError("Allowed types: .pdf, .doc, .docx, .xlsx, .xls, .csv, .txt");
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file && !pastedText.trim()) {
      setError("Upload a file or paste text to import.");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("orgId", orgId);
      if (file) formData.append("file", file);
      if (pastedText.trim()) formData.append("text", pastedText.trim());

      const response = await fetch("/api/shows/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process import");
      }

      const importJob: ImportJob = data.job;
      const inferredNotes = buildNotes(importJob.structured);
      setJob(importJob);

      setFormValues({
        title:
          importJob.structured.core.event.value ||
          importJob.structured.core.venue.value ||
          "Imported gig",
        date: importJob.structured.core.date.value || "",
        city: importJob.structured.core.city.value || "",
        venueName: importJob.structured.core.venue.value || "",
        setTime:
          importJob.structured.hospitalityLogistics.setTime.value || "",
        notes: inferredNotes,
      });

      toast.success("Data parsed", {
        description: "Review the extracted fields before approving.",
      });
    } catch (err) {
      logger.error("Error analyzing import data", err);
      const message = err instanceof Error ? err.message : "Failed to process import";
      setError(message);
      toast.error("Import failed", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!formValues.title.trim() || !formValues.date) {
      setError("Title and date are required before approval.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/shows/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "commit",
          orgId,
          payload: {
            title: formValues.title.trim(),
            date: formValues.date,
            city: formValues.city.trim(),
            venueName: formValues.venueName.trim(),
            setTime: formValues.setTime.trim(),
            notes: formValues.notes.trim(),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to finalize import");
      }

      toast.success("Import saved", {
        description: "Gig created from imported data.",
      });
      setOpen(false);
      setJob(null);
      setFile(null);
      setPastedText("");
      router.refresh();
    } catch (err) {
      logger.error("Error finalizing import", err);
      const message = err instanceof Error ? err.message : "Failed to finalize import";
      setError(message);
      toast.error("Could not save import", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setJob(null);
    setFile(null);
    setPastedText("");
    setFormValues({
      title: "",
      date: "",
      city: "",
      venueName: "",
      setTime: "",
      notes: "",
    });
    setError(null);
    setIsLoading(false);
  };

  const reviewFields: Array<{
    label: string;
    key: keyof ReviewFormState;
    type?: "text" | "date" | "time";
    placeholder?: string;
  }> = [
    { label: "Gig title", key: "title", placeholder: "Summer Festival" },
    { label: "Date", key: "date", type: "date" },
    { label: "City", key: "city", placeholder: "Stockholm" },
    { label: "Venue", key: "venueName", placeholder: "Debaser Strand" },
    { label: "Set time", key: "setTime", type: "time", placeholder: "20:30" },
  ];

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        variant="outline"
        type="button"
        className="font-semibold cursor-pointer"
      >
        <Upload className="w-5 h-5" />
        Import data
      </Button>

      {open ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            role="dialog"
            className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col space-y-1.5">
                <h2 className="font-semibold tracking-tight flex items-center gap-2 text-xl">
                  <FileType2 className="h-5 w-5" />
                  Import gigs from docs or text
                </h2>
                <p className="text-sm text-muted-foreground">
                  Upload PDF/Doc/Excel/CSV/TXT or paste raw text. Oncore normalizes the content and highlights low-confidence fields for review.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOpen(false);
                  handleReset();
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {error ? (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            ) : null}

            {!job ? (
              <form onSubmit={handleAnalyze} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Upload files</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/60 transition-colors">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <div className="text-sm">
                          {file ? (
                            <span className="text-primary font-medium">{file.name}</span>
                          ) : (
                            <>
                              <span className="text-primary font-medium">Click to upload</span>
                              <span className="text-muted-foreground"> or drag and drop</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          .pdf / .doc / .docx / .xlsx / .xls / .csv / .txt
                        </span>
                        {file ? (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)} | {file.type || "unknown format"}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="paste-text">
                      Paste text (email threads, chats, daysheets, riders)
                    </label>
                    <Textarea
                      id="paste-text"
                      value={pastedText}
                      onChange={(event) => setPastedText(event.target.value)}
                      placeholder="Paste any unstructured text here. Supports WhatsApp exports, forwarded emails, riders, daysheets, and free-form notes."
                      rows={10}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <InfoTile title="Supported files (v1)">
                    <p className="text-xs text-muted-foreground">
                      .pdf, .doc/.docx, .xlsx/.xls, .csv, .txt, or paste plain text.
                    </p>
                  </InfoTile>
                  <InfoTile title="Examples">
                    <p className="text-xs text-muted-foreground">
                      Email threads, WhatsApp chats, contracts, tech/hospitality riders, flight tickets, Excel/CSV gig lists, daysheets.
                    </p>
                  </InfoTile>
                  <InfoTile title="Workflow">
                    <p className="text-xs text-muted-foreground">
                      Extract -> dedupe by date/city/venue/artist -> structured fields -> review screen -> approve or discard.
                    </p>
                  </InfoTile>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      handleReset();
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Processing..." : "Scan and extract"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={hasDuplicates ? "destructive" : "secondary"}>
                    {hasDuplicates ? "Possible duplicate" : "Ready for review"}
                  </Badge>
                  {job.metadata ? (
                    <span className="text-xs text-muted-foreground">
                      {job.metadata.name} | {formatFileSize(job.metadata.size)} | {job.metadata.type || "unknown"}
                    </span>
                  ) : null}
                  {job.warnings?.map((warn) => (
                    <Badge key={warn} variant="outline">
                      {warn}
                    </Badge>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-base">
                          Review & edit extracted fields
                        </h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={isLoading}
                        className="gap-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Start over
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {reviewFields.map((field) => (
                        <div className="space-y-1" key={field.key}>
                          <label className="text-sm font-medium">{field.label}</label>
                          <Input
                            type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                            value={formValues[field.key]}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [field.key]: event.target.value,
                              }))
                            }
                            disabled={isLoading}
                          />
                        </div>
                      ))}

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Notes</label>
                        <Textarea
                          value={formValues.notes}
                          onChange={(event) =>
                            setFormValues((prev) => ({ ...prev, notes: event.target.value }))
                          }
                          rows={4}
                          placeholder="Payment terms, hospitality, tech, travel, or anything else."
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button onClick={handleApprove} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Approve & save gig"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setJob(null);
                          setError(null);
                        }}
                        disabled={isLoading}
                      >
                        Discard result
                      </Button>
                    </div>

                    {hasDuplicates ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <p className="font-semibold text-sm text-amber-700">
                            Possible duplicates detected (matched on date/city/venue/title)
                          </p>
                        </div>
                        <div className="space-y-2">
                          {job.duplicates.map((dup) => (
                            <div
                              key={dup.id}
                              className="rounded-md border border-amber-200 bg-white/50 p-3 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">{dup.title || "Untitled show"}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {dup.date || "Date unknown"}
                                    {dup.venue ? ` | ${dup.venue}` : ""}
                                    {dup.city ? ` | ${dup.city}` : ""}
                                  </p>
                                </div>
                                <Badge variant="outline">Score {dup.score}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          We never auto-overwrite. Confirm details before creating a new gig.
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Raw text preview</p>
                      <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
                        <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                          {job.rawText || "No raw text captured"}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Extracted fields</h3>
                    <FieldGroup
                      title="Core"
                      items={[
                        { label: "Date", field: job.structured.core.date },
                        { label: "City", field: job.structured.core.city },
                        { label: "Venue", field: job.structured.core.venue },
                        { label: "Event/Tour", field: job.structured.core.event },
                        { label: "Artist", field: job.structured.core.artist },
                        { label: "Promoter", field: job.structured.core.promoter },
                      ]}
                    />
                    <FieldGroup
                      title="Deal"
                      items={[
                        { label: "Fee", field: job.structured.deal.fee },
                        { label: "Deal type", field: job.structured.deal.dealType },
                        { label: "Currency", field: job.structured.deal.currency },
                        { label: "Payment terms", field: job.structured.deal.paymentTerms },
                      ]}
                    />
                    <FieldGroup
                      title="Hospitality / Logistics"
                      items={[
                        { label: "Hotel", field: job.structured.hospitalityLogistics.hotel },
                        { label: "Transport", field: job.structured.hospitalityLogistics.transport },
                        { label: "Catering", field: job.structured.hospitalityLogistics.catering },
                        { label: "Soundcheck", field: job.structured.hospitalityLogistics.soundcheck },
                        { label: "Set time", field: job.structured.hospitalityLogistics.setTime },
                      ]}
                    />
                    <FieldGroup
                      title="Tech & Rider"
                      items={[
                        { label: "Equipment", field: job.structured.tech.equipment },
                        { label: "Backline", field: job.structured.tech.backline },
                        { label: "Stage", field: job.structured.tech.stage },
                        { label: "Light", field: job.structured.tech.light },
                        { label: "Sound", field: job.structured.tech.sound },
                      ]}
                    />
                    <FieldGroup
                      title="Travel"
                      items={[
                        { label: "Flights", field: job.structured.travel.flights },
                        { label: "Times", field: job.structured.travel.times },
                        { label: "Airport codes", field: job.structured.travel.airportCodes },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function FieldGroup({
  title,
  items,
}: {
  title: string;
  items: { label: string; field: StructuredField }[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="outline" className="text-[10px]">
          AI draft
        </Badge>
      </div>
      <div className="grid gap-2">
        {items.map(({ label, field }) => (
          <div
            key={label}
            className={`rounded-md border px-3 py-2 text-sm ${
              field.value
                ? confidenceTone(field.confidence).bg
                : "bg-muted/30 border-dashed"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{label}</span>
              {field.value ? (
                <Badge variant="outline" className="text-[10px]">
                  {confidenceTone(field.confidence).label}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              {field.value || "Not found"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoTile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-1">
      <p className="text-xs font-semibold">{title}</p>
      {children}
    </div>
  );
}

function confidenceTone(confidence: number): { label: string; bg: string } {
  if (confidence >= 0.75) return { label: "High", bg: "bg-emerald-50 border-emerald-200" };
  if (confidence >= 0.5) return { label: "Medium", bg: "bg-amber-50 border-amber-200" };
  return { label: "Low", bg: "bg-rose-50 border-rose-200" };
}

function formatFileSize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  if (size >= 1_000) return `${(size / 1_000).toFixed(1)} KB`;
  return `${size} B`;
}

function buildNotes(structured: StructuredGig): string {
  const parts: string[] = [];
  if (structured.core.artist.value) parts.push(`Artist: ${structured.core.artist.value}`);
  if (structured.deal.fee.value) parts.push(`Fee: ${structured.deal.fee.value}`);
  if (structured.deal.dealType.value) parts.push(`Deal: ${structured.deal.dealType.value}`);
  if (structured.deal.paymentTerms.value) parts.push(`Terms: ${structured.deal.paymentTerms.value}`);
  if (structured.hospitalityLogistics.hotel.value) parts.push(`Hotel: ${structured.hospitalityLogistics.hotel.value}`);
  if (structured.hospitalityLogistics.catering.value) parts.push(`Catering: ${structured.hospitalityLogistics.catering.value}`);
  if (structured.tech.backline.value) parts.push(`Backline: ${structured.tech.backline.value}`);
  if (structured.travel.flights.value) parts.push(`Travel: ${structured.travel.flights.value}`);

  return parts.join(" | ");
}
