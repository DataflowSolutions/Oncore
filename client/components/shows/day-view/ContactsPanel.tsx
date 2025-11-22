"use client";

import { Mail, Phone } from "lucide-react";
import Link from "next/link";

// import { Users } from "lucide-react";

const contacts = [
  { role: "Venue Manager", name: "Sarah Johnson" },
  { role: "Production Manager", name: "Mike Rodriguez" },
  { role: "Tour Manager", name: "Alex Chen" },
];

export function ContactsPanel() {
  return (
    <div className="bg-card border border-card-border rounded-[20px] p-6">
      <h3 className="text-xl font-medium text-card-foreground font-header mb-4">
        {/* <Users className="w-4 h-4 text-green-400" /> */}
        Key Contacts
      </h3>
      <div className="flex flex-col gap-3">
        {contacts.map((contact, index) => (
          <div
            key={index}
            className="bg-card-cell rounded-full px-3 py-2 flex justify-between items-center"
          >
            <div className="font-header text-xs">{contact.name}</div>
            <div className="flex gap-1">
              <Link
                title={`Email ${contact.name}`}
                href={`mailto:${contact.name}@example.com`}
                className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-6"
              >
                <Mail
                  size={12}
                  className="inline-block text-card-foreground hover:text-neutral-400 cursor-pointer"
                />
              </Link>
              <Link
                className="bg-button-bg-contact border border-button-border-contact rounded-full flex items-center justify-center size-6"
                title={`Call ${contact.name}`}
                href={`tel:1234567890`}
              >
                <Phone
                  size={12}
                  className="inline-block text-card-foreground hover:text-neutral-400 cursor-pointer"
                />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
