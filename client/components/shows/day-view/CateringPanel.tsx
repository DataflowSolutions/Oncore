"use client";

// import { Utensils } from "lucide-react";

export function CateringPanel() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {/* <Utensils className="w-4 h-4 text-orange-400" /> */}
        Catering
      </h3>
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <p className="text-sm text-neutral-400">
          No catering information available
        </p>
        <p className="text-xs text-neutral-500 mt-2">
          Catering details will be shown here
        </p>
      </div>
    </div>
  );
}
