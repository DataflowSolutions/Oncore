import React from "react";
import { documents, contacts } from "../constants/fakeDocsContacts";
import { Plus, Phone, Mail } from "lucide-react";

export function DocumentsContacts() {
  return (
    <div className="bg-[#111] rounded-xl p-6 border-foreground/10 border w-full xl:w-[400px]">
      <h2 className="text-xl font-semibold mb-1 text-foreground">
        Documents & Contacts
      </h2>
      <p className="text-xs text-foreground/50 mb-6">
        Important files and key personnel
      </p>
      <div className="mb-6">
        <div className="font-semibold text-white mb-2">Documents</div>
        <div className="flex flex-col gap-3">
          {documents.map((doc, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-foreground/5 border border-foreground/10 rounded-md px-4 py-3 cursor-pointer hover:bg-foreground/10 transition hover:scale-[1.02]"
            >
              <span className="text-white/90 font-medium">{doc.name}</span>

              <Plus className="w-4 h-4" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="font-semibold text-white mb-2">Key Contacts</div>
        <div className="flex flex-col gap-3">
          {contacts.map((c, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center rounded-md px-4 py-3 bg-foreground/5 border border-foreground/10"
            >
              <div>
                <div className="font-semibold text-white">{c.role}</div>
                <div className="text-xs text-white/70">{c.name}</div>
              </div>
              <div className="flex gap-3 text-foreground/50">
                <a title={`Call ${c.name}`} href={`tel:${c.phone}`}>
                  <Phone className="w-4 h-4 hover:text-foreground" />
                </a>
                <a title={`Email ${c.name}`} href={`mailto:${c.email}`}>
                  <Mail className="w-4 h-4 hover:text-foreground" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
