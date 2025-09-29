import React from "react";
import { logistics } from "../constants/fakeLogistics";

export function LogisticsTravel() {
  return (
    <div className="bg-[#111] rounded-xl p-6 border-foreground/10 border w-full xl:w-[400px]">
      <h2 className="text-xl font-semibold mb-1 text-foreground">
        Logistics & Travel
      </h2>
      <p className="text-xs text-foreground/50 mb-6">
        Accommodation and transportation details
      </p>
      <div className="flex flex-col gap-3">
        <div className="bg-foreground/5 rounded-md p-4 border border-foreground/10">
          <div className="font-semibold text-white mb-2 text-base">Hotel</div>
          <div className="text-sm text-white/80 mb-2">
            {logistics.hotel.name}
          </div>
          <div className="text-sm text-white/60 mb-1">
            Check-in: {logistics.hotel.checkIn} &nbsp; Check-out:{" "}
            {logistics.hotel.checkOut}
          </div>
        </div>
        <div className="bg-foreground/5 rounded-md p-4 border border-foreground/10">
          <div className="font-semibold text-white mb-2 text-base">Flights</div>
          <div className="flex flex-col gap-3">
            {logistics.flights.map((f, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm text-white/80"
              >
                <span>
                  {f.label}: {f.code}
                </span>
                <span>
                  {f.from} → {f.to}
                </span>
                <span>
                  {f.depart} - {f.arrive}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-foreground/5 rounded-md p-4 border border-foreground/10">
          <div className="font-semibold text-white mb-2 text-base">
            Transportation
          </div>
          <div className="flex flex-col gap-3">
            {logistics.transportation.map((t, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm text-white/80"
              >
                <span>{t.time}</span>
                <span>
                  {t.from} → {t.to}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-foreground/5 rounded-md p-4 border border-foreground/10">
          <div className="font-semibold text-white mb-2 text-base">
            Catering
          </div>
          <div className="text-sm text-white/80 mb-2">
            {logistics.catering.company}
          </div>
          <div className="text-sm text-white/60 mb-1">
            Service time: {logistics.catering.serviceTime}
          </div>
        </div>
      </div>
    </div>
  );
}
