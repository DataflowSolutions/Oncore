"use client";

import { Popup } from "@/components/ui/popup";
import { EditableText } from "@/components/ui/editable-text";
import {
  Mail,
  Phone,
  User,
  Briefcase,
  Calendar,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

interface ContactDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id?: string;
    name: string;
    role?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    created_at?: string;
  };
  onUpdate?: (updates: {
    name?: string;
    role?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => Promise<void>;
}

export function ContactDetailPopup({
  open,
  onOpenChange,
  contact,
  onUpdate,
}: ContactDetailPopupProps) {
  const sanitize = (val: string) => {
    const trimmed = val.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const handleUpdate = async (updates: {
    name?: string;
    role?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => {
    if (onUpdate) {
      await onUpdate(updates);
    }
  };

  return (
    <Popup title="Contact Details" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {/* Name */}
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Name</p>
            {onUpdate ? (
              <EditableText
                value={contact.name}
                onSave={(v) => handleUpdate({ name: sanitize(v) })}
                placeholder="Name"
                className={cn("font-medium", inlineEditButtonClasses)}
              />
            ) : (
              <p className="font-medium">{contact.name}</p>
            )}
          </div>
        </div>

        {/* Role */}
        <div className="flex items-start gap-3">
          <Briefcase className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Role</p>
            {onUpdate ? (
              <EditableText
                value={contact.role || ""}
                onSave={(v) => handleUpdate({ role: sanitize(v) })}
                placeholder="N/A"
                className={cn("text-sm", inlineEditButtonClasses)}
              />
            ) : (
              <p className="text-sm">{contact.role || "N/A"}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            {onUpdate ? (
              <EditableText
                value={contact.email || ""}
                onSave={(v) => handleUpdate({ email: sanitize(v) })}
                placeholder="N/A"
                inputType="email"
                className={cn("text-sm text-primary", inlineEditButtonClasses)}
              />
            ) : contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-primary hover:underline"
              >
                {contact.email}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">N/A</p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-3">
          <Phone className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Phone</p>
            {onUpdate ? (
              <EditableText
                value={contact.phone || ""}
                onSave={(v) => handleUpdate({ phone: sanitize(v) })}
                placeholder="N/A"
                inputType="tel"
                className={cn("text-sm text-primary", inlineEditButtonClasses)}
              />
            ) : contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="text-sm text-primary hover:underline"
              >
                {contact.phone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">N/A</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="pt-3 border-t">
          <div className="flex items-start gap-3">
            <StickyNote className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">Notes</p>
              {onUpdate ? (
                <EditableText
                  value={contact.notes || ""}
                  onSave={(v) => handleUpdate({ notes: sanitize(v) })}
                  placeholder="Add notes..."
                  multiline
                  className={cn(
                    "text-sm whitespace-pre-wrap",
                    inlineEditButtonClasses
                  )}
                />
              ) : contact.notes ? (
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
        </div>

        {/* Created Date */}
        {contact.created_at && (
          <div className="flex items-start gap-3 pt-3 border-t">
            <Calendar className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Added</p>
              <p className="text-sm">
                {new Date(contact.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}
