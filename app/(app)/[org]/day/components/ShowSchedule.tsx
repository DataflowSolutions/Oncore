import React from "react";
import { showSchedule } from "../constants/fakeSchedule";

export function ShowSchedule() {
  // Timeline hours (12:00 to 24:00)
  const hours = Array.from(
    { length: 13 },
    (_, i) => `${(12 + i).toString().padStart(2, "0")}:00`
  );

  // Helper: get block top offset and height based on time/duration
  function getBlockPosition(time: string, duration: number) {
    // Each hour = 60px tall, each minute = 1px
    const [h, m] = time.split(":").map(Number);
    const startMinutes = (h - 12) * 60 + m;
    const top = startMinutes;
    const height = duration;
    return { top, height };
  }

  return (
    <div className="bg-[#111] rounded-xl p-6 border-foreground/10 border xl:w-[400px] w-full">
      <h2 className="text-xl font-semibold mb-1 text-foreground">
        Show Schedule
      </h2>
      <p className="text-xs text-foreground/50 mb-6">
        Event timeline for the day
      </p>
      <div className="relative" style={{ height: 780 }}>
        {/* Timeline hours on left */}
        <div
          className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-foreground/60"
          style={{ width: 54 }}
        >
          {hours.map((hr) => (
            <div key={hr} style={{ height: 60 }}>
              {hr}
            </div>
          ))}
        </div>
        {/* Vertical line */}
        <div
          className="absolute left-[52px] top-0 h-full border-l border-foreground/10"
          style={{ width: 1 }}
        />
        {/* Schedule blocks */}
        <div className="relative ml-[60px]" style={{ height: 780 }}>
          {showSchedule.map((item, idx) => {
            const { top, height } = getBlockPosition(item.time, item.duration);
            return (
              <div
                key={idx}
                className="absolute w-full rounded-md shadow"
                style={{
                  top: top,
                  height: Math.max(height, 32),
                  background: getColor(idx),
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 18px",
                }}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-semibold text-xs text-white truncate max-w-[140px] overflow-hidden whitespace-nowrap">
                    {item.title}
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    {item.duration} min{" "}
                    <span className="ml-2 font-bold">{item.time}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getColor(idx: number) {
  const colors = [
    "linear-gradient(90deg, #25324a 70%, #1a1a1a 100%)", // blue
    "linear-gradient(90deg, #3a294a 70%, #1a1a1a 100%)", // purple
    "linear-gradient(90deg, #444446 70%, #1a1a1a 100%)", // gray
    "linear-gradient(90deg, #4a3925 70%, #1a1a1a 100%)", // brown
    "linear-gradient(90deg, #233a2a 70%, #1a1a1a 100%)", // green
    "linear-gradient(90deg, #4a2525 70%, #1a1a1a 100%)", // red
    "linear-gradient(90deg, #222 70%, #1a1a1a 100%)", // dark gray
  ];
  return colors[idx % colors.length];
}
