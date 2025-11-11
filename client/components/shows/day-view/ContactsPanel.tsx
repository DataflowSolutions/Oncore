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
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {/* <Users className="w-4 h-4 text-green-400" /> */}
        Key Contacts
      </h3>
      <div className="space-y-3">
        {contacts.map((contact, index) => (
          <div
            key={index}
            className="bg-neutral-800/50 rounded-lg p-3 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{contact.name}</div>
              <div className="text-xs text-neutral-500 mb-1">
                {contact.role}
              </div>
            </div>
            <div className="flex gap-1">
              <Link title={`Call ${contact.name}`} href={`tel:1234567890`}>
                <Phone
                  size={16}
                  className="inline-block mr-1 text-neutral-600 hover:text-neutral-400 cursor-pointer"
                />
              </Link>
              <Link
                title={`Email ${contact.name}`}
                href={`mailto:${contact.name}@example.com`}
              >
                <Mail
                  size={16}
                  className="inline-block mr-1 text-neutral-600 hover:text-neutral-400 cursor-pointer"
                />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
