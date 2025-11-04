"use client";

// import { FileText } from "lucide-react";

const documents = [
  "Contract",
  "Rider",
  "Advancing",
  "Boarding Pass",
  "Visa",
  "Other",
];

export function DocumentsPanel() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {/* <FileText className="w-4 h-4 text-blue-400" /> */}
        Documents
      </h3>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc}
            className="flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <span className="text-sm">{doc}</span>
            <span className="text-xs text-neutral-500">not attached</span>
          </div>
        ))}
      </div>
    </div>
  );
}
