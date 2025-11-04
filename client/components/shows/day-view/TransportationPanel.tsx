"use client";

// import { Car } from "lucide-react";

export function TransportationPanel() {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {/* <Car className="w-4 h-4 text-yellow-400" /> */}
        Transportation
      </h3>
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <p className="text-sm text-neutral-400">No transportation scheduled</p>
        <p className="text-xs text-neutral-500 mt-2">
          Ground transportation will be shown here
        </p>
      </div>
    </div>
  );
}
