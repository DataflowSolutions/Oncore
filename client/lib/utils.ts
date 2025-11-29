import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date for display - uses consistent UTC formatting to avoid hydration mismatches
 * between server and client (different timezones).
 * 
 * @param date - Date string, Date object, or null/undefined
 * @param options - Formatting options
 * @returns Formatted date string or fallback
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    format?: "date" | "time" | "datetime" | "short-date" | "short-time"
    fallback?: string
  } = {}
): string {
  const { format = "date", fallback = "" } = options

  if (!date) return fallback

  try {
    const d = typeof date === "string" ? new Date(date) : date
    
    if (isNaN(d.getTime())) return fallback

    switch (format) {
      case "date":
        // Nov 29, 2025
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      
      case "short-date":
        // 11/29/2025
        return d.toLocaleDateString("en-US", {
          timeZone: "UTC",
        })
      
      case "time":
        // 3:30 PM
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        })
      
      case "short-time":
        // 3:30 PM (no seconds)
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        })
      
      case "datetime":
        // Nov 29, 2025 at 3:30 PM
        return `${d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })} at ${d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        })}`
      
      default:
        return d.toLocaleDateString("en-US", { timeZone: "UTC" })
    }
  } catch {
    return fallback
  }
}

/**
 * Format time only from a date - for schedule displays
 * Handles local timezone for schedule items that should display in user's local time
 */
export function formatTime(
  date: string | Date | null | undefined,
  options: {
    fallback?: string
    includeSeconds?: boolean
  } = {}
): string {
  const { fallback = "", includeSeconds = false } = options

  if (!date) return fallback

  try {
    const d = typeof date === "string" ? new Date(date) : date
    
    if (isNaN(d.getTime())) return fallback

    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: true,
    })
  } catch {
    return fallback
  }
}

/**
 * Format a date range (e.g., for check-in/check-out)
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  options: { fallback?: string } = {}
): string {
  const { fallback = "" } = options
  
  const start = formatDate(startDate, { format: "short-date" })
  const end = formatDate(endDate, { format: "short-date" })
  
  if (!start && !end) return fallback
  if (!start) return end
  if (!end) return start
  
  return `${start} - ${end}`
}