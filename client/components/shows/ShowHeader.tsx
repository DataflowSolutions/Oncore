"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import { EditableText } from "@/components/ui/editable-text";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShowTabs } from "@/components/shows/ShowTabs";
import { updateShow } from "@/lib/actions/shows";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

const inlineEditButtonClasses =
  "px-0 py-0 border-none bg-transparent hover:bg-transparent focus-visible:ring-0 [&>span:last-child]:hidden";

type ShowStatus = "draft" | "confirmed" | "cancelled";

interface ShowHeaderProps {
  showId: string;
  orgSlug: string;
  initialTitle: string;
  initialDate: string;
  initialStatus: ShowStatus;
}

const statusConfig: Record<
  ShowStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  draft: {
    label: "draft",
    variant: "secondary",
  },
  confirmed: {
    label: "confirmed",
    variant: "default",
  },
  cancelled: {
    label: "cancelled",
    variant: "destructive",
  },
};

export function ShowHeader({
  showId,
  orgSlug,
  initialTitle,
  initialDate,
  initialStatus,
}: ShowHeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [status, setStatus] = useState<ShowStatus>(initialStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Convert date to local date value for input (YYYY-MM-DD)
  const toLocalDateValue = (isoDate: string) => {
    if (!isoDate) return "";
    return isoDate.split("T")[0];
  };

  // Format display date
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const dateObj = new Date(dateStr + "T00:00:00");
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle show title update
  const handleTitleUpdate = async (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    try {
      await updateShow(showId, { title: trimmed });
      setTitle(trimmed);
    } catch (error) {
      logger.error("Error updating show title", error);
      toast.error("Failed to update show title");
      throw error;
    }
  };

  // Handle show date update
  const handleDateUpdate = async (newDate: string) => {
    if (!newDate) return;

    try {
      await updateShow(showId, { date: newDate });
      setDate(newDate);
    } catch (error) {
      logger.error("Error updating show date", error);
      toast.error("Failed to update show date");
      throw error;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: ShowStatus) => {
    if (newStatus === status) return;

    setIsUpdatingStatus(true);
    try {
      await updateShow(showId, { status: newStatus });
      setStatus(newStatus);
      toast.success(`Show status updated to ${statusConfig[newStatus].label}`);
    } catch (error) {
      logger.error("Error updating show status", error);
      toast.error("Failed to update show status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const currentStatusConfig = statusConfig[status];

  return (
    <div className="flex justify-between items-start gap-4 max-w-[1440px] mx-auto">
      <div className="space-y-2 flex-1">
        <div className="flex gap-4 items-center">
          <EditableText
            value={title || "Untitled Show"}
            onSave={handleTitleUpdate}
            placeholder="Untitled Show"
            className={cn("text-3xl font-header", inlineEditButtonClasses)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isUpdatingStatus}>
              <button className="cursor-pointer">
                <Badge
                  variant={currentStatusConfig.variant}
                  className="hover:opacity-80 transition-opacity"
                >
                  {currentStatusConfig.label}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(statusConfig) as ShowStatus[]).map(
                (statusOption) => (
                  <DropdownMenuItem
                    key={statusOption}
                    onClick={() => handleStatusUpdate(statusOption)}
                    className="flex items-center gap-2"
                  >
                    {status === statusOption && <Check className="h-4 w-4" />}
                    <span
                      className={`cursor-pointer ${
                        status === statusOption ? "" : "ml-6"
                      }`}
                    >
                      {statusConfig[statusOption].label}
                    </span>
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {date && (
            <EditableText
              value={toLocalDateValue(date)}
              onSave={handleDateUpdate}
              placeholder="Select date"
              inputType="date"
              className={cn(
                "text-sm text-muted-foreground",
                inlineEditButtonClasses
              )}
              displayValue={formatDisplayDate(date)}
            />
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <ShowTabs orgSlug={orgSlug} showId={showId} />
    </div>
  );
}
