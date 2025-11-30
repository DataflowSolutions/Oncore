"use client";

import { Popup } from "@/components/ui/popup";
import { Mail, Phone, User, Briefcase, Calendar } from "lucide-react";

interface ContactDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    name: string;
    role?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    created_at?: string;
  };
}

export function ContactDetailPopup({
  open,
  onOpenChange,
  contact,
}: ContactDetailPopupProps) {
  return (
    <Popup title="Contact Details" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {/* Name */}
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Name</p>
            <p className="font-medium">{contact.name}</p>
          </div>
        </div>

        {/* Role */}
        <div className="flex items-start gap-3">
          <Briefcase className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Role</p>
            <p className="text-sm">{contact.role || "N/A"}</p>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            {contact.email ? (
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
            {contact.phone ? (
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
        {contact.notes && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

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
