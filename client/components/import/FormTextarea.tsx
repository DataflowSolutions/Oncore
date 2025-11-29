"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  confidence?: number;
  confidenceThreshold?: number;
}

/**
 * Reusable textarea component for import confirmation sections
 * Consistent styling with dark background matching the design
 */
export function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  disabled = false,
  confidence,
  confidenceThreshold,
}: FormTextareaProps) {
  const threshold = confidenceThreshold ?? 0.75;
  const isLowConfidence = confidence !== undefined && confidence < threshold;

  return (
    <div
      className={cn("space-y-2", className)}
      data-low-confidence={isLowConfidence ? "true" : undefined}
    >
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          "bg-card-cell border-card-cell-border resize-none",
          isLowConfidence && "border-amber-400/80 bg-amber-50/60 text-foreground"
        )}
      />
    </div>
  );
}
