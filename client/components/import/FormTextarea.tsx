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
}: FormTextareaProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="bg-card-cell border-card-cell-border resize-none"
      />
    </div>
  );
}
