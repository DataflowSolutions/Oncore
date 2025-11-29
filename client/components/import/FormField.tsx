"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "time" | "email" | "tel" | "number";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  confidence?: number;
  confidenceThreshold?: number;
}

/**
 * Reusable form field component for import confirmation sections
 * Consistent styling with dark background inputs matching the design
 */
export function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
  disabled = false,
  confidence,
  confidenceThreshold,
}: FormFieldProps) {
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
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "bg-card-cell border-card-cell-border",
          isLowConfidence && "border-amber-400/80 bg-amber-50/60 text-foreground"
        )}
      />
    </div>
  );
}
