"use client";

import { useState } from "react";
import { ScheduleItemModal } from "./ScheduleItemModal";
import { Database } from "@/lib/database.types";
import {
  createScheduleItem,
  deleteScheduleItem,
  updateScheduleItem,
} from "@/lib/actions/schedule";
import { ScheduleTimeline } from "./day-view/ScheduleTimeline";
import { HotelPanel } from "./day-view/HotelPanel";
import { DocumentsPanel } from "./day-view/DocumentsPanel";
import { CateringPanel } from "./day-view/CateringPanel";
import { ContactsPanel } from "./day-view/ContactsPanel";
import { FlightsPanel } from "./day-view/FlightsPanel";
import { TransportationPanel } from "./day-view/TransportationPanel";

type DBScheduleItem = Database["public"]["Tables"]["schedule_items"]["Row"];

type AdvancingDocumentWithFiles = {
  id: string;
  label: string | null;
  party_type: "from_us" | "from_you";
  created_at: string;
  files: Array<{
    id: string;
    original_name: string | null;
    content_type: string | null;
    size_bytes: number | null;
    storage_path: string;
    created_at: string;
  }>;
};

interface ScheduleItem {
  id: string;
  time: string; // ISO datetime string
  title: string;
  location?: string;
  type: "arrival" | "departure" | "show" | "venue" | "schedule";
  personId?: string;
  personName?: string;
  endTime?: string;
  notes?: string;
}

interface CalendarDayViewProps {
  currentDate: Date;
  showDate: string;
  doorsAt?: string | null;
  setTime?: string | null;
  selectedPeopleIds: string[];
  assignedPeople: Array<{
    person_id: string;
    duty: string | null;
    people: {
      id: string;
      name: string;
      member_type: string | null;
    } | null;
  }>;
  advancingData?: {
    arrivalFlights: Array<{
      personId: string;
      time?: string;
      flightNumber?: string;
      from?: string;
      to?: string;
    }>;
    departureFlights: Array<{
      personId: string;
      time?: string;
      flightNumber?: string;
      from?: string;
      to?: string;
    }>;
  };
  scheduleItems?: DBScheduleItem[];
  orgSlug: string;
  showId: string;
  documents?: AdvancingDocumentWithFiles[];
  advancingSessionId?: string;
  advancingFields?: Array<{ field_name: string; value: unknown }>;
}

export function CalendarDayView({
  currentDate,
  showDate,
  doorsAt,
  setTime,
  selectedPeopleIds,
  assignedPeople,
  advancingData,
  scheduleItems: dbScheduleItems = [],
  orgSlug,
  showId,
  documents = [],
  advancingSessionId,
  advancingFields = [],
}: CalendarDayViewProps) {
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Build schedule items
  const scheduleItems: ScheduleItem[] = [];

  // Helper function to get date string in local timezone (YYYY-MM-DD)
  const getLocalDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Add show times (global) - only if on show date
  const showDateObj = new Date(showDate);
  showDateObj.setHours(0, 0, 0, 0);
  const currentDateStr = getLocalDateStr(currentDate);
  const showDateNormalized = getLocalDateStr(showDateObj);
  const isShowDate = currentDateStr === showDateNormalized;

  if (isShowDate && doorsAt) {
    scheduleItems.push({
      id: "doors",
      time: doorsAt,
      title: "Doors",
      type: "venue",
    });
  }

  if (isShowDate && setTime) {
    scheduleItems.push({
      id: "set",
      time: setTime,
      title: "Set Time",
      type: "show",
    });
  }

  // Add schedule_items from database (Load In, Sound Check, etc.)
  dbScheduleItems.forEach((item) => {
    const itemDate = new Date(item.starts_at);
    const itemDateStr = getLocalDateStr(itemDate);

    // Only show items for the current date
    if (itemDateStr === currentDateStr) {
      scheduleItems.push({
        id: item.id,
        time: item.starts_at,
        title: item.title,
        location: item.location || undefined,
        type: "schedule",
        endTime: item.ends_at || undefined,
        notes: item.notes || undefined,
      });
    }
  });

  // Add person-specific flight items from advancing data - filter by current date
  if (advancingData && selectedPeopleIds.length > 0) {
    selectedPeopleIds.forEach((personId) => {
      const person = assignedPeople.find(
        (p) => p.person_id === personId
      )?.people;
      const personName = person?.name || "Unknown";

      const personArrival = advancingData.arrivalFlights.find(
        (f) => f.personId === personId
      );

      if (personArrival && personArrival.time) {
        const arrivalDate = new Date(personArrival.time);
        const arrivalDateStr = getLocalDateStr(arrivalDate);

        if (arrivalDateStr === currentDateStr) {
          scheduleItems.push({
            id: `arrival-${personId}`,
            time: personArrival.time,
            title: `${personArrival.flightNumber || "Flight"}`,
            location: `${personArrival.from || ""} → ${personArrival.to || ""}`,
            type: "arrival" as const,
            personId,
            personName,
          });
        }
      }

      const personDeparture = advancingData.departureFlights.find(
        (f) => f.personId === personId
      );

      if (personDeparture && personDeparture.time) {
        const departureDate = new Date(personDeparture.time);
        const departureDateStr = getLocalDateStr(departureDate);

        if (departureDateStr === currentDateStr) {
          scheduleItems.push({
            id: `departure-${personId}`,
            time: personDeparture.time,
            title: `${personDeparture.flightNumber || "Flight"}`,
            location: `${personDeparture.from || ""} → ${
              personDeparture.to || ""
            }`,
            type: "departure" as const,
            personId,
            personName,
          });
        }
      }
    });
  }

  // Calculate which dates have events (using local dates for consistency)
  const datesWithEvents: string[] = [];

  // Add show date if it has show times
  if (doorsAt || setTime) {
    datesWithEvents.push(showDateNormalized);
  }

  // Add dates from schedule items
  dbScheduleItems.forEach((item) => {
    const itemDateStr = getLocalDateStr(new Date(item.starts_at));
    if (!datesWithEvents.includes(itemDateStr)) {
      datesWithEvents.push(itemDateStr);
    }
  });

  // Add dates from advancing data
  if (advancingData && selectedPeopleIds.length > 0) {
    selectedPeopleIds.forEach((personId) => {
      const personArrival = advancingData.arrivalFlights.find(
        (f) => f.personId === personId
      );
      if (personArrival?.time) {
        const arrivalDateStr = getLocalDateStr(new Date(personArrival.time));
        if (!datesWithEvents.includes(arrivalDateStr)) {
          datesWithEvents.push(arrivalDateStr);
        }
      }

      const personDeparture = advancingData.departureFlights.find(
        (f) => f.personId === personId
      );
      if (personDeparture?.time) {
        const departureDateStr = getLocalDateStr(
          new Date(personDeparture.time)
        );
        if (!datesWithEvents.includes(departureDateStr)) {
          datesWithEvents.push(departureDateStr);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Main Grid Layout - Left: Schedule, Right: Info Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Show Schedule Timeline */}
        <div className="lg:col-span-1">
          <ScheduleTimeline
            scheduleItems={scheduleItems}
            currentDateStr={currentDateStr}
            orgSlug={orgSlug}
            showId={showId}
            onItemClick={(item) => {
              setSelectedItem(item);
              setIsModalOpen(true);
            }}
            onCreateItem={async (data) => {
              await createScheduleItem(orgSlug, showId, data);
            }}
            onDeleteItem={async (itemId) => {
              await deleteScheduleItem(orgSlug, showId, itemId);
            }}
            currentDate={currentDate}
            datesWithEvents={datesWithEvents}
            availablePeople={assignedPeople
              .filter((p) => p.people)
              .map((p) => ({
                id: p.person_id,
                name: p.people!.name,
                duty: p.duty,
              }))}
            selectedPeopleIds={selectedPeopleIds}
          />
        </div>

        {/* RIGHT COLUMNS: Info Panels */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            <HotelPanel
              advancingFields={advancingFields}
              assignedPeople={assignedPeople}
            />
            <CateringPanel advancingFields={advancingFields} />
            <FlightsPanel
              selectedPeopleIds={selectedPeopleIds}
              advancingData={advancingData}
              currentDateStr={currentDateStr}
              getLocalDateStr={getLocalDateStr}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <DocumentsPanel
              documents={documents}
              assignedPeople={assignedPeople}
              orgSlug={orgSlug}
              sessionId={advancingSessionId || ""}
            />
            <ContactsPanel />
            <TransportationPanel
              advancingFields={advancingFields}
              assignedPeople={assignedPeople}
            />
          </div>
        </div>
      </div>

      {/* Schedule Item Modal */}
      <ScheduleItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onUpdate={async (id, updates) => {
          await updateScheduleItem(orgSlug, showId, id, updates);
        }}
        isEditable={selectedItem?.type === "schedule"}
      />
    </div>
  );
}
