"use client";
import { logger } from "@/lib/logger";

import { useState } from "react";
import { Popup } from "@/components/ui/popup";
import { Badge } from "@/components/ui/badge";
import { EditableText } from "@/components/ui/editable-text";
import {
  Plane,
  PlaneLanding,
  MapPin,
  Music,
  Clock,
  User,
  Calendar,
} from "lucide-react";

interface ScheduleItemModalProps {
  item: {
    id: string;
    time: string;
    title: string;
    location?: string;
    type: "arrival" | "departure" | "show" | "venue" | "schedule";
    personId?: string;
    personName?: string;
    endTime?: string;
    notes?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (
    id: string,
    updates: {
      title?: string;
      starts_at?: string;
      ends_at?: string | null;
      location?: string;
      notes?: string;
    }
  ) => Promise<void>;
  isEditable?: boolean;
}

export function ScheduleItemModal({
  item,
  isOpen,
  onClose,
  onUpdate,
  isEditable = false,
}: ScheduleItemModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!item) return null;

  const getIcon = () => {
    switch (item.type) {
      case "arrival":
        return <PlaneLanding className="w-6 h-6" />;
      case "departure":
        return <Plane className="w-6 h-6" />;
      case "venue":
        return <MapPin className="w-6 h-6" />;
      case "show":
        return <Music className="w-6 h-6" />;
      case "schedule":
        return <Clock className="w-6 h-6" />;
      default:
        return <Calendar className="w-6 h-6" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case "arrival":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "departure":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "show":
        return "bg-red-500/20 text-red-300 border-red-500/40";
      case "venue":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "schedule":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/40";
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    if (!onUpdate || !isEditable) return;

    setIsUpdating(true);
    try {
      await onUpdate(item.id, { [field]: value });
    } catch (error) {
      logger.error("Failed to update", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <Popup open={isOpen} onOpenChange={onClose} title="" className="max-w-2xl">
      <div className="flex items-center gap-3 -mt-4 mb-4">
        <div className={`p-2 rounded-lg border ${getTypeColor()}`}>
          {getIcon()}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">
            {isEditable && item.type === "schedule" ? (
              <EditableText
                value={item.title}
                onSave={(value) => handleUpdate("title", value)}
                className="text-2xl font-semibold"
              />
            ) : (
              item.title
            )}
          </h2>
          <Badge className={`mt-1 ${getTypeColor()}`}>
            {item.type.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="space-y-6 pt-4">
        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Start Time</span>
            </div>
            <div className="text-lg font-semibold">{formatTime(item.time)}</div>
            <div className="text-sm text-muted-foreground">
              {formatDate(item.time)}
            </div>
          </div>

          {item.endTime && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>End Time</span>
              </div>
              <div className="text-lg font-semibold">
                {formatTime(item.endTime)}
              </div>
            </div>
          )}
        </div>

        {/* Person Information */}
        {item.personName && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Person</span>
            </div>
            <div className="text-lg font-medium">{item.personName}</div>
          </div>
        )}

        {/* Location Information */}
        {item.location && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </div>
            {isEditable && item.type === "schedule" ? (
              <EditableText
                value={item.location}
                onSave={(value) => handleUpdate("location", value)}
                className="text-lg"
              />
            ) : (
              <div className="text-lg">{item.location}</div>
            )}
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Notes</span>
            </div>
            {isEditable && item.type === "schedule" ? (
              <EditableText
                value={item.notes}
                onSave={(value) => handleUpdate("notes", value)}
                className="text-sm"
                multiline
              />
            ) : (
              <div className="text-sm text-muted-foreground italic">
                {item.notes}
              </div>
            )}
          </div>
        )}

        {isEditable && item.type === "schedule" && (
          <div className="text-xs text-muted-foreground italic">
            💡 Double-click on any text to edit
          </div>
        )}
      </div>
    </Popup>
  );
}
