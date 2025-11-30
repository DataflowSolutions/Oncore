/**
 * Converts a time string like "9:30 PM" or ISO "2025-03-14T16:00:00" to "HH:mm" for <input type="time" />
 */
export function formatToTimeInputValue(time: string): string {
  if (!time) return "";
  // Handle ISO string
  if (/T\d{2}:\d{2}/.test(time)) {
    const match = time.match(/T(\d{2}):(\d{2})/);
    if (match) return `${match[1]}:${match[2]}`;
  }
  // Handle "9:30 PM" or "9:30AM"
  const ampmMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  // Handle "9:30" (already valid)
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":");
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return "";
}
