"use client";

import * as React from "react";
import { Loader2, Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type ActivationMode = "click" | "double-click";

interface EditableTextProps {
  value?: string | null;
  onSave: (newValue: string) => void | Promise<void>;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  multiline?: boolean;
  inputType?: React.HTMLInputTypeAttribute;
  activationMode?: ActivationMode;
  displayValue?: React.ReactNode;
  disabled?: boolean;
  saveOnBlur?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  onEditStateChange?: (isEditing: boolean) => void;
}

export function EditableText({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = "Click to edit",
  multiline = false,
  inputType = "text",
  activationMode = "double-click",
  displayValue,
  disabled = false,
  saveOnBlur,
  maxLength,
  autoFocus,
  onEditStateChange,
}: EditableTextProps) {
  const initialValue = value ?? "";
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(initialValue);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null
  );

  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value ?? "");
    }
  }, [value, isEditing]);

  React.useEffect(() => {
    if (isEditing) {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [isEditing]);

  const notifyStateChange = (next: boolean) => {
    onEditStateChange?.(next);
  };

  const beginEditing = () => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value ?? "");
    setError(null);
    notifyStateChange(true);
  };

  const exitEditing = () => {
    setIsEditing(false);
    notifyStateChange(false);
  };

  const handleSave = async () => {
    if (disabled || isSaving) return;
    const trimmedValue = multiline ? editValue : editValue.trim();
    const currentValue = value ?? "";

    if (trimmedValue === currentValue) {
      exitEditing();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedValue);
      exitEditing();
    } catch (err) {
      logger.error("Failed to save editable text", err);
      setError("Failed to save changes");
      setEditValue(currentValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value ?? "");
    setError(null);
    exitEditing();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (event.key === "Enter") {
      if (!multiline) {
        event.preventDefault();
        handleSave();
      } else if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        handleSave();
      }
    }
  };

  const saveWhenBlur = saveOnBlur ?? !multiline;

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;
    const assignRef = (node: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRef.current = node;
    };
    return (
      <div className="space-y-1">
        <InputComponent
          ref={assignRef}
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          onBlur={saveWhenBlur ? handleSave : undefined}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-auto min-h-[2.25rem] resize-none text-base",
            multiline && "leading-relaxed",
            inputClassName
          )}
          placeholder={placeholder}
          disabled={isSaving}
          data-error={Boolean(error)}
          maxLength={maxLength}
          autoFocus={autoFocus}
          {...(!multiline ? { type: inputType } : {})}
        />
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving…</span>
            </>
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span>
              {multiline
                ? "Ctrl+Enter to save · Esc to cancel"
                : "Enter to save · Esc to cancel"}
            </span>
          )}
        </div>
      </div>
    );
  }

  const resolvedValue = displayValue ?? (initialValue ? initialValue : null);

  return (
    <button
      type="button"
      title="Double-click to edit"
      onClick={activationMode === "click" ? beginEditing : undefined}
      onDoubleClick={
        activationMode === "double-click" ? beginEditing : undefined
      }
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          beginEditing();
        }
      }}
      disabled={disabled}
      className={cn(
        "group relative flex items-center gap-2 rounded-md border border-transparent py-0.5! text-left text-sm transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/70"
          : "cursor-pointer hover:bg-background/30!",
        className
      )}
    >
      <span className={cn(!resolvedValue && "text-muted-foreground italic")}>
        {resolvedValue ?? placeholder}
      </span>
      {!disabled && (
        <span className="ml-auto flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
          Edit
        </span>
      )}
    </button>
  );
}
