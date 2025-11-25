"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  FileType2,
  AlertCircle,
  X,
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

type GigCandidate = {
  candidateId: string;
  title: string | null;
  date: string | null;
  city: string | null;
  venueName: string | null;
  setTime: string | null;
  notes: string | null;
  structured: StructuredGig;
  duplicates: DuplicateCandidate[];
  confidenceMap: Record<string, number>;
  showId?: string | null;
};

type ImportJob = {
  id: string;
  status: "processing" | "needs_review" | "completed";
  rawText: string;
  normalizedText: string;
  candidates: GigCandidate[];
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
  artistName: string;
};

export default function ImportDataButton({ orgId }: ImportDataButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [job, setJob] = useState<ImportJob | null>(null);
  const [formValues, setFormValues] = useState<Record<string, ReviewFormState>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);

  const hasDuplicates = useMemo(() => {
    if (!job) return false;
    return job.candidates.some((c) => c.duplicates.length > 0);
  }, [job]);

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

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("File too large. Max 20MB supported.");
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
      setJob(importJob);

      const nextForms: Record<string, ReviewFormState> = {};
      for (const candidate of importJob.candidates) {
        nextForms[candidate.candidateId] = {
          title:
            candidate.title ||
            candidate.structured.core.event.value ||
            candidate.structured.core.venue.value ||
            "Imported gig",
          date: candidate.date || candidate.structured.core.date.value || "",
        city: candidate.city || candidate.structured.core.city.value || "",
        venueName: candidate.venueName || candidate.structured.core.venue.value || "",
        setTime:
          candidate.setTime ||
          candidate.structured.hospitalityLogistics.setTime.value ||
          "",
        notes: buildNotes(candidate.structured),
        artistName: candidate.structured.core.artist.value || "",
      };
    }
      setFormValues(nextForms);

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

  const handleApprove = async (candidateId: string) => {
    const candidate = job?.candidates.find((c) => c.candidateId === candidateId);
    const form = formValues[candidateId];

    if (!candidate || !form || !form.title.trim() || !form.date) {
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
          jobId: job?.id,
          payload: {
            candidateId,
            title: form.title.trim(),
            date: form.date,
            city: form.city.trim(),
            venueName: form.venueName.trim(),
            setTime: form.setTime.trim(),
            notes: form.notes.trim(),
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
      setJob((prev) =>
        prev
          ? {
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.candidateId === candidateId ? { ...c, showId: data.showId } : c,
              ),
            }
          : prev,
      );
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
    setFormValues({});
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            className="relative z-50 flex flex-col w-full max-w-5xl max-h-[90vh] gap-4 border bg-background shadow-lg duration-200 sm:rounded-lg overflow-hidden"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4 border-b pb-4 px-6 pt-6 flex-shrink-0">
              <div className="flex flex-col space-y-1">
                <h2 className="font-semibold tracking-tight flex items-center gap-2 text-lg">
                  <FileType2 className="h-5 w-5" />
                  Import gigs from docs or text
                </h2>
                <p className="text-xs text-muted-foreground">
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

            <ScrollArea className="flex-1 px-6">

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
                      Extract - dedupe by date/city/venue/artist - structured fields - review screen - approve or discard.
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    disabled={isLoading}
                    className="gap-1 ml-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Start over
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Confidence threshold
                    </div>
                    <select
                      className="border rounded px-2 py-1 text-sm bg-background"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                      disabled={isLoading}
                    >
                      <option value={0.5}>50%</option>
                      <option value={0.6}>60%</option>
                      <option value={0.7}>70%</option>
                    </select>
                  </div>

                  {job.candidates.map((candidate) => {
                    const form = formValues[candidate.candidateId] ?? {
                      title: "",
                      date: "",
                      city: "",
                      venueName: "",
                      setTime: "",
                      notes: "",
                      artistName: "",
                    };
                    const lowConfidence = Object.entries(candidate.confidenceMap || {})
                      .filter(([key, value]) => key.startsWith(candidate.candidateId) && value < confidenceThreshold)
                      .map(([key]) => key.split(".").slice(1).join("."));

                    return (
                      <div key={candidate.candidateId} className="rounded-lg border border-border bg-muted/10 p-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                          <div>
                            <p className="font-semibold text-lg">{form.title || candidate.title || "Untitled gig"}</p>
                            <p className="text-sm text-muted-foreground">
                              {form.date || candidate.date || "Date TBD"}
                              {candidate.venueName ? ` | ${candidate.venueName}` : ""}
                              {candidate.city ? ` | ${candidate.city}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {candidate.showId ? (
                              <Badge variant="secondary">Created</Badge>
                            ) : (
                              <Badge variant="outline">Needs review</Badge>
                            )}
                            {candidate.duplicates.length > 0 ? (
                              <Badge variant="destructive">Possible duplicate</Badge>
                            ) : null}
                            {lowConfidence.length > 0 ? (
                              <Badge variant="outline">Low confidence: {lowConfidence.length} fields</Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                          <div className="space-y-2">
                            {reviewFields.map((field) => (
                              <div className="space-y-1" key={`${candidate.candidateId}-${field.key}`}>
                                <label className="text-sm font-medium">{field.label}</label>
                                <Input
                                  type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                                  value={form[field.key]}
                                  placeholder={field.placeholder}
                                  onChange={(event) =>
                                    setFormValues((prev) => ({
                                      ...prev,
                                      [candidate.candidateId]: {
                                        ...(prev[candidate.candidateId] ?? form),
                                        [field.key]: event.target.value,
                                      },
                                    }))
                                  }
                                  disabled={isLoading}
                                />
                              </div>
                            ))}

                            <div className="space-y-1">
                              <label className="text-sm font-medium">Notes</label>
                              <Textarea
                                value={form.notes}
                                onChange={(event) =>
                                  setFormValues((prev) => ({
                                    ...prev,
                                    [candidate.candidateId]: {
                                      ...(prev[candidate.candidateId] ?? form),
                                      notes: event.target.value,
                                    },
                                  }))
                                }
                                rows={2}
                                placeholder="Payment terms, hospitality, tech, travel, or anything else."
                                disabled={isLoading}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium flex items-center gap-2">
                                Artist
                                {!form.artistName && (
                                  <Badge variant="destructive">Missing</Badge>
                                )}
                              </label>
                              <Input
                                value={form.artistName}
                                placeholder={candidate.structured.core.artist.value || "Select or type artist"}
                                onChange={(event) =>
                                  setFormValues((prev) => ({
                                    ...prev,
                                    [candidate.candidateId]: {
                                      ...(prev[candidate.candidateId] ?? form),
                                      artistName: event.target.value,
                                    },
                                  }))
                                }
                                disabled={isLoading}
                              />
                              <p className="text-xs text-muted-foreground">
                                Auto-attaches matching artist. If none found, show will be marked for assignment.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3 pt-1">
                              <Button onClick={() => handleApprove(candidate.candidateId)} disabled={isLoading || !!candidate.showId}>
                                {candidate.showId ? "Already created" : isLoading ? "Saving..." : "Approve & save gig"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setJob((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          candidates: prev.candidates.filter((c) => c.candidateId !== candidate.candidateId),
                                        }
                                      : prev,
                                  );
                                }}
                                disabled={isLoading}
                              >
                                Discard candidate
                              </Button>
                            </div>

                            {candidate.duplicates.length > 0 ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <p className="font-semibold text-sm text-amber-700">
                                    Possible duplicates detected (matched on date/city/venue/title)
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  {candidate.duplicates.map((dup) => (
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
                          </div>

                          <details className="group" open>
                            <summary className="cursor-pointer list-none">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                                <h3 className="font-semibold text-sm">AI-Extracted Fields</h3>
                                <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </summary>
                            <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-2">
                              <FieldGroup
                                title="Core"
                                items={[
                                  { label: "Date", field: candidate.structured.core.date },
                                  { label: "City", field: candidate.structured.core.city },
                                  { label: "Venue", field: candidate.structured.core.venue },
                                  { label: "Event/Tour", field: candidate.structured.core.event },
                                  { label: "Artist", field: candidate.structured.core.artist },
                                  { label: "Promoter", field: candidate.structured.core.promoter },
                                ]}
                                threshold={confidenceThreshold}
                              />
                              <FieldGroup
                                title="Deal"
                                items={[
                                  { label: "Fee", field: candidate.structured.deal.fee },
                                  { label: "Deal type", field: candidate.structured.deal.dealType },
                                  { label: "Currency", field: candidate.structured.deal.currency },
                                  { label: "Payment terms", field: candidate.structured.deal.paymentTerms },
                                ]}
                                threshold={confidenceThreshold}
                              />
                              <FieldGroup
                                title="Hospitality / Logistics"
                                items={[
                                  { label: "Hotel", field: candidate.structured.hospitalityLogistics.hotel },
                                  { label: "Transport", field: candidate.structured.hospitalityLogistics.transport },
                                  { label: "Catering", field: candidate.structured.hospitalityLogistics.catering },
                                  { label: "Soundcheck", field: candidate.structured.hospitalityLogistics.soundcheck },
                                  { label: "Set time", field: candidate.structured.hospitalityLogistics.setTime },
                                ]}
                                threshold={confidenceThreshold}
                              />
                              <FieldGroup
                                title="Tech & Rider"
                                items={[
                                  { label: "Equipment", field: candidate.structured.tech.equipment },
                                  { label: "Backline", field: candidate.structured.tech.backline },
                                  { label: "Stage", field: candidate.structured.tech.stage },
                                  { label: "Light", field: candidate.structured.tech.light },
                                  { label: "Sound", field: candidate.structured.tech.sound },
                                ]}
                                threshold={confidenceThreshold}
                              />
                              <FieldGroup
                                title="Travel"
                                items={[
                                  { label: "Flights", field: candidate.structured.travel.flights },
                                  { label: "Times", field: candidate.structured.travel.times },
                                  { label: "Airport codes", field: candidate.structured.travel.airportCodes },
                                ]}
                                threshold={confidenceThreshold}
                              />
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <p className="text-xs font-semibold">Raw text preview</p>
                      <svg className="h-3 w-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>
                  <ScrollArea className="h-32 rounded-md border bg-muted/30 p-2 mt-2">
                    <pre className="whitespace-pre-wrap break-words text-[10px] text-muted-foreground leading-tight">
                      {job.rawText || "No raw text captured"}
                    </pre>
                  </ScrollArea>
                </details>
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <p className="text-xs font-semibold">Normalized text</p>
                      <svg className="h-3 w-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>
                  <ScrollArea className="h-32 rounded-md border bg-muted/30 p-2 mt-2">
                    <pre className="whitespace-pre-wrap break-words text-[10px] text-muted-foreground leading-tight">
                      {job.normalizedText || job.rawText || "No normalized text"}
                    </pre>
                  </ScrollArea>
                </details>
              </div>
            )}
            </ScrollArea>
            <div className="h-6 flex-shrink-0" />
          </div>
        </div>
      ) : null}
    </>
  );
}

function FieldGroup({
  title,
  items,
  threshold,
}: {
  title: string;
  items: { label: string; field: StructuredField }[];
  threshold: number;
}) {
  const fieldsWithValues = items.filter(item => item.field.value);
  if (fieldsWithValues.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
        <Badge variant="outline" className="text-[9px] h-4">
          AI draft
        </Badge>
      </div>
      <div className="grid gap-1.5">
        {fieldsWithValues.map(({ label, field }) => (
          <div
            key={label}
            className={`rounded border px-2 py-1.5 text-xs ${
              confidenceTone(field.confidence).bg
            } ${field.confidence < threshold ? "ring-1 ring-amber-300" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-[11px]">{label}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1">
                {confidenceTone(field.confidence).label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5 leading-snug">
              {field.value}
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
