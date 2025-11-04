"use client";

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
          <div key={index} className="bg-neutral-800/50 rounded-lg p-4">
            <div className="text-sm text-neutral-500 mb-1">{contact.role}</div>
            <div className="font-medium">{contact.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
