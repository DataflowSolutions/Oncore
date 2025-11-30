import { getAdvancingDocuments } from "@/lib/actions/advancing";
import { getShowLodging } from "@/lib/actions/advancing/lodging";
import { getShowFlights } from "@/lib/actions/advancing/flights";
import { getShowCatering } from "@/lib/actions/advancing/catering";
import { getShowContacts } from "@/lib/actions/advancing/show-contacts";
import { getSupabaseServer } from "@/lib/supabase/server";
import { CalendarDayView } from "@/components/shows/CalendarDayView";

// Force dynamic rendering to show loading state
export const dynamic = "force-dynamic";

interface ShowDayPageProps {
  params: Promise<{ org: string; showId: string }>;
  searchParams: Promise<{ people?: string; date?: string }>; // Comma-separated person IDs and date
}

export default async function ShowDayPage({
  params,
  searchParams,
}: ShowDayPageProps) {
  const { org: orgSlug, showId } = await params;
  const { people: selectedPeopleParam, date: dateParam } = await searchParams;

  // Parse selected people from query params
  const selectedPeopleIds = selectedPeopleParam
    ? selectedPeopleParam.split(",").filter(Boolean)
    : [];

  // Track if user manually selected a date
  const hasManualDateSelection = !!dateParam;

  // Parse date from query params (default to today)
  // Use UTC to avoid timezone issues with date-only strings
  let currentDate: Date;
  if (dateParam) {
    // Parse as local date (YYYY-MM-DD) without timezone conversion
    const [year, month, day] = dateParam.split("-").map(Number);
    currentDate = new Date(year, month - 1, day);
    currentDate.setHours(0, 0, 0, 0);
  } else {
    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
  }

  // OPTIMIZED: Use cached helpers and parallelize all data fetching
  const { getCachedOrg, getCachedShow, getCachedShowSchedule } = await import(
    "@/lib/cache"
  );
  const supabase = await getSupabaseServer();

  // Parallelize ALL data fetching at once
  const [orgResult, showResult, scheduleResult, assignedPeopleResult] =
    await Promise.all([
      getCachedOrg(orgSlug),
      getCachedShow(showId),
      getCachedShowSchedule(showId),
      (supabase as any)
        .from("show_assignments")
        .select(
          `
        person_id,
        duty,
        people (
          id,
          name,
          member_type
        )
      `
        )
        .eq("show_id", showId),
    ]);

  const { data: org } = orgResult;
  const { data: show } = showResult;
  const { data: scheduleItems } = scheduleResult;
  const { data: assignedPeople } = assignedPeopleResult;

  if (!org) {
    return <div>Organization not found</div>;
  }

  if (!show) {
    return <div>Show not found</div>;
  }

  // Fetch advancing data (flight times, hotel, etc) for the calendar
  // The new schema stores flights directly in advancing_flights table
  let advancingData = undefined;
  const advancingFields: Array<{ field_name: string; value: unknown }> = [];
  let advancingDocuments = [] as Awaited<
    ReturnType<typeof getAdvancingDocuments>
  >;

  // Fetch lodging, flights, and catering data using RPCs
  const [
    lodgingData,
    flightsData,
    cateringData,
    documentsData,
    showContactsData,
  ] = await Promise.all([
    getShowLodging(showId),
    getShowFlights(showId),
    getShowCatering(showId),
    getAdvancingDocuments(showId),
    getShowContacts(showId),
  ]);

  advancingDocuments = documentsData;

  if (flightsData && flightsData.length > 0) {
    const arrivalFlights: Array<{
      personId: string;
      time: string;
      flightNumber: string;
      from: string;
      to: string;
    }> = [];
    const departureFlights: Array<{
      personId: string;
      time: string;
      flightNumber: string;
      from: string;
      to: string;
    }> = [];

    flightsData.forEach((flight) => {
      if (flight.direction === "arrival" && flight.arrival_at) {
        arrivalFlights.push({
          personId: flight.person_id || "",
          time: flight.arrival_at,
          flightNumber: flight.flight_number || "",
          from: flight.depart_city || flight.depart_airport_code || "",
          to: flight.arrival_city || flight.arrival_airport_code || "",
        });
      } else if (flight.direction === "departure" && flight.depart_at) {
        departureFlights.push({
          personId: flight.person_id || "",
          time: flight.depart_at,
          flightNumber: flight.flight_number || "",
          from: flight.depart_city || flight.depart_airport_code || "",
          to: flight.arrival_city || flight.arrival_airport_code || "",
        });
      }
    });

    advancingData = { arrivalFlights, departureFlights };
  }

  // Helper function to get date string in local timezone (YYYY-MM-DD)
  const getLocalDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Calculate which dates have events (for auto-navigation)
  const datesWithEvents: string[] = [];

  // Add show date if it has show times
  const showDateObj = new Date(show.date);
  showDateObj.setHours(0, 0, 0, 0);
  const showDateNormalized = getLocalDateStr(showDateObj);

  if (show.doors_at || show.set_time) {
    datesWithEvents.push(showDateNormalized);
  }

  // Add dates from schedule items
  if (scheduleItems) {
    scheduleItems.forEach((item: any) => {
      const itemDateStr = getLocalDateStr(new Date(item.starts_at));
      if (!datesWithEvents.includes(itemDateStr)) {
        datesWithEvents.push(itemDateStr);
      }
    });
  }

  // ... (rest of the file)

  return (
    <div className="space-y-6">
      {/* Main Day Schedule View - Multi-Layer Timeline */}
      <CalendarDayView
        currentDate={currentDate}
        showDate={show.date}
        doorsAt={show.doors_at}
        setTime={show.set_time}
        assignedPeople={assignedPeople || []}
        selectedPeopleIds={selectedPeopleIds}
        advancingData={advancingData}
        scheduleItems={scheduleItems || []}
        orgSlug={orgSlug}
        showId={showId}
        documents={(advancingDocuments || []) as any}
        advancingFields={advancingFields}
        lodgingData={lodgingData}
        flightsData={flightsData}
        cateringData={cateringData as any}
        contactsData={showContactsData as any}
      />
    </div>
  );
}
