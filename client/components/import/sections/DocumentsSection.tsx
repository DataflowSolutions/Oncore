"use client";

import { useRef } from "react";
import { X, Plus, Upload } from "lucide-react";
import { SectionContainer } from "../SectionContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImportedDocument, DocumentCategory } from "../types";
import { DOCUMENT_CATEGORIES } from "../types";

type ConfidenceLookup = (path: string) => number | undefined;

interface DocumentsSectionProps {
  data: ImportedDocument[];
  onChange: (data: ImportedDocument[]) => void;
  confidenceForField?: ConfidenceLookup;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Documents section of the import confirmation form
 * Lists uploaded documents with category dropdown and remove button
 */
export function DocumentsSection({ data, onChange, confidenceForField }: DocumentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateCategory = (index: number, category: DocumentCategory) => {
    const updated = [...data];
    updated[index] = { ...updated[index], category };
    onChange(updated);
  };

  const removeDocument = (index: number) => {
    const updated = data.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newDocs: ImportedDocument[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      category: "other" as DocumentCategory,
      file,
    }));

    onChange([...data, ...newDocs]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <SectionContainer title="Documents">
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No documents added yet
          </p>
        ) : (
          data.map((doc, index) => {
            const fileConfidence = confidenceForField?.(`documents[${index}].fileName`);
            const categoryConfidence = confidenceForField?.(`documents[${index}].category`);
            const isLowConfidence =
              (fileConfidence !== undefined && fileConfidence < 0.75) ||
              (categoryConfidence !== undefined && categoryConfidence < 0.75);

            return (
              <div
                key={doc.id || index}
                className={cn(
                  "flex items-center justify-between gap-4 p-4 bg-card-cell rounded-lg border border-card-cell-border",
                  isLowConfidence && "border-amber-400/80 bg-amber-50/60"
                )}
                data-low-confidence={isLowConfidence ? "true" : undefined}
              >
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.fileSize)}
                  </p>
                </div>

                {/* Category dropdown */}
                <div className="flex items-center gap-3">
                  <Select
                    value={doc.category}
                    onValueChange={(value) => updateCategory(index, value as DocumentCategory)}
                  >
                    <SelectTrigger className="w-32 bg-card-cell border-card-cell-border">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeDocument(index)}
                    className="p-1 hover:bg-destructive/10 rounded-md transition-colors text-muted-foreground hover:text-destructive"
                    aria-label="Remove document"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        />

        {/* Add document button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddClick}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Add Document
        </Button>
      </div>
    </SectionContainer>
  );
}
