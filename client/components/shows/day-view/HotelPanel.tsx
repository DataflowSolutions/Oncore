"use client";

// import { MapPin } from "lucide-react";

export function HotelPanel() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {/* <MapPin className="w-4 h-4 text-purple-400" /> */}
        Hotel
      </h3>
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <p className="text-sm text-neutral-400">
          No hotel information available
        </p>
        <p className="text-xs text-neutral-500 mt-2">
          Hotel details will be shown here
        </p>
      </div>
    </div>
  );
}
