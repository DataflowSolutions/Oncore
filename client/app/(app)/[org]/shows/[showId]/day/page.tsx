import { getAdvancingDocuments } from "@/lib/actions/advancing";
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
  const [
    orgResult,
    showResult,
    scheduleResult,
    assignedPeopleResult,
    advancingSessionResult,
  ] = await Promise.all([
    getCachedOrg(orgSlug),
    getCachedShow(showId),
    getCachedShowSchedule(showId),
    supabase
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
    supabase
      .from("advancing_sessions")
      .select("id")
      .eq("show_id", showId)
      .single(),
  ]);

  const { data: org } = orgResult;
  const { data: show } = showResult;
  const { data: scheduleItems } = scheduleResult;
  const { data: assignedPeople } = assignedPeopleResult;
  const { data: advancingSession } = advancingSessionResult;

  let advancingDocuments = [] as Awaited<
    ReturnType<typeof getAdvancingDocuments>
  >;
  if (advancingSession?.id) {
    advancingDocuments = await getAdvancingDocuments(advancingSession.id);
  }

  if (!org) {
    return <div>Organization not found</div>;
  }

  if (!show) {
    return <div>Show not found</div>;
  }

  // Fetch advancing data (flight times, hotel, etc) for the calendar
  let advancingData = undefined;
  let advancingFields: Array<{ field_name: string; value: unknown }> = [];

  if (advancingSession && assignedPeople) {
    console.log("Fetching fields for session:", advancingSession.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fields, error: fieldsError } = await (supabase as any).rpc(
      "get_advancing_fields",
      {
        p_session_id: advancingSession.id,
      }
    );

    if (fieldsError) {
      console.error("Error fetching advancing fields:", fieldsError);
    }

    console.log("Raw RPC response - fields:", fields);
    console.log("Raw RPC response - error:", fieldsError);

    if (fields && Array.isArray(fields)) {
      console.log("Fetched advancing fields count:", fields.length);
      console.log("Fetched advancing fields:", fields);
      advancingFields = fields as Array<{ field_name: string; value: unknown }>;
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

      assignedPeople.forEach((person) => {
        // Extract arrival flight data
        const arrivalTime = advancingFields.find(
          (f) =>
            f.field_name === `arrival_flight_${person.person_id}_arrivalTime`
        );
        const arrivalDate = advancingFields.find(
          (f) =>
            f.field_name === `arrival_flight_${person.person_id}_arrivalDate`
        );
        const flightNumber = advancingFields.find(
          (f) =>
            f.field_name === `arrival_flight_${person.person_id}_flightNumber`
        );
        const fromCity = advancingFields.find(
          (f) => f.field_name === `arrival_flight_${person.person_id}_fromCity`
        );
        const toCity = advancingFields.find(
          (f) => f.field_name === `arrival_flight_${person.person_id}_toCity`
        );

        if (arrivalTime?.value && arrivalDate?.value) {
          arrivalFlights.push({
            personId: person.person_id,
            time: `${arrivalDate.value}T${arrivalTime.value}`,
            flightNumber: String(flightNumber?.value || ""),
            from: String(fromCity?.value || ""),
            to: String(toCity?.value || ""),
          });
        }

        // Extract departure flight data
        const departureTime = advancingFields.find(
          (f) =>
            f.field_name ===
            `departure_flight_${person.person_id}_departureTime`
        );
        const departureDate = advancingFields.find(
          (f) =>
            f.field_name ===
            `departure_flight_${person.person_id}_departureDate`
        );
        const deptFlightNumber = advancingFields.find(
          (f) =>
            f.field_name === `departure_flight_${person.person_id}_flightNumber`
        );
        const deptFromCity = advancingFields.find(
          (f) =>
            f.field_name === `departure_flight_${person.person_id}_fromCity`
        );
        const deptToCity = advancingFields.find(
          (f) => f.field_name === `departure_flight_${person.person_id}_toCity`
        );

        if (departureTime?.value && departureDate?.value) {
          departureFlights.push({
            personId: person.person_id,
            time: `${departureDate.value}T${departureTime.value}`,
            flightNumber: String(deptFlightNumber?.value || ""),
            from: String(deptFromCity?.value || ""),
            to: String(deptToCity?.value || ""),
          });
        }
      });

      advancingData = { arrivalFlights, departureFlights };
    }
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
    scheduleItems.forEach((item) => {
      const itemDateStr = getLocalDateStr(new Date(item.starts_at));
      if (!datesWithEvents.includes(itemDateStr)) {
        datesWithEvents.push(itemDateStr);
      }
    });
  }

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

  // Auto-select closest date with events if no manual date selection
  if (!hasManualDateSelection && datesWithEvents.length > 0) {
    // Find the closest date to today
    const todayStr = getLocalDateStr(new Date());
    const todayTime = new Date(todayStr).getTime();

    let closestDate = datesWithEvents[0];
    let closestDiff = Math.abs(
      new Date(datesWithEvents[0]).getTime() - todayTime
    );

    for (const dateStr of datesWithEvents) {
      const diff = Math.abs(new Date(dateStr).getTime() - todayTime);
      if (diff < closestDiff) {
        closestDate = dateStr;
        closestDiff = diff;
      }
    }

    // Update currentDate to the closest date (no redirect, just render with it)
    const [year, month, day] = closestDate.split("-").map(Number);
    currentDate = new Date(year, month - 1, day);
    currentDate.setHours(0, 0, 0, 0);
  }

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
        documents={advancingDocuments || []}
        advancingSessionId={advancingSession?.id}
        advancingFields={advancingFields}
      />
    </div>
  );
}
