"use client";

import { Plus, Trash2 } from "lucide-react";
import { FormField } from "../FormField";
import { SectionContainer } from "../SectionContainer";
import { Button } from "@/components/ui/button";
import type { ImportedContact } from "../types";
import { createEmptyContact } from "../types";

interface ContactsSectionProps {
  data: ImportedContact[];
  onChange: (data: ImportedContact[]) => void;
}

/**
 * Contacts section of the import confirmation form
 * Shows a grid of contacts with Name, Phone, Email, Role fields
 * Supports adding/removing contacts
 */
export function ContactsSection({ data, onChange }: ContactsSectionProps) {
  const updateContact = <K extends keyof ImportedContact>(
    index: number,
    field: K,
    value: ImportedContact[K]
  ) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addContact = () => {
    onChange([...data, createEmptyContact()]);
  };

  const removeContact = (index: number) => {
    const updated = data.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <SectionContainer title="Contacts">
      <div className="space-y-4">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No contacts imported
          </p>
        ) : (
          data.map((contact, index) => (
            <div
              key={contact.id || index}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
            >
              <FormField
                label="Name"
                value={contact.name}
                onChange={(v) => updateContact(index, "name", v)}
                placeholder="Contact name"
              />
              <FormField
                label="Phone"
                value={contact.phone}
                onChange={(v) => updateContact(index, "phone", v)}
                type="tel"
                placeholder="Phone number"
              />
              <FormField
                label="Email"
                value={contact.email}
                onChange={(v) => updateContact(index, "email", v)}
                type="email"
                placeholder="Email address"
              />
              <FormField
                label="Role"
                value={contact.role}
                onChange={(v) => updateContact(index, "role", v)}
                placeholder="e.g., Tour Manager"
              />
              <div className="flex justify-end pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContact(index)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove contact"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Add contact button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContact}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>
    </SectionContainer>
  );
}
