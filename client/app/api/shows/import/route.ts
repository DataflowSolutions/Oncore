import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type {
  ImportedHotel,
  ImportedFlight,
  ImportedFood,
  ImportedDocument,
  ImportedContact,
  ImportedTechnical,
} from "@/components/import/types";

interface CommitRequest {
  intent?: string;
  orgId?: string;
  jobId?: string;
  payload?: {
    title?: string;
    date?: string; // YYYY-MM-DD
    setTime?: string | null; // HH:mm (optional)
    venueName?: string | null;
    city?: string | null;
    country?: string | null;
    artistName?: string | null;
    notes?: string | null;

    // Additional extracted sections
    deal?: unknown;
    hotels?: ImportedHotel[];
    food?: ImportedFood[];
    flights?: ImportedFlight[];
    activities?: unknown[];
    documents?: ImportedDocument[];
    contacts?: ImportedContact[];
    technical?: ImportedTechnical;
  };
}

/**
 * Parse time string in various formats to 24-hour HH:mm:ss format
 * Supports: "9:30 PM", "21:30", "9:30pm", "21:30:00"
 */
function parseTimeTo24Hour(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const trimmed = timeStr.trim();
  
  // Check for AM/PM format
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, "0")}:${minutes}:00`;
  }
  
  // Already in 24-hour format (HH:mm or HH:mm:ss)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(":");
    const hours = String(parts[0]).padStart(2, "0");
    const minutes = parts[1];
    const seconds = parts[2] || "00";
    return `${hours}:${minutes}:${seconds}`;
  }
  
  return null;
}

function buildSetTime(date?: string, setTime?: string | null): string | null {
  if (!date || !setTime) return null;
  const time24 = parseTimeTo24Hour(setTime);
  if (!time24) return null;
  return `${date}T${time24}`;
}

function toISODate(input: string): string | null {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildTimestamp(date?: string, time?: string): string | null {
  if (!date) return null;
  const isoDate = toISODate(date);
  if (!isoDate) return null;
  if (!time) return `${isoDate}T00:00:00`;
  
  const time24 = parseTimeTo24Hour(time);
  if (!time24) return `${isoDate}T00:00:00`;
  
  return `${isoDate}T${time24}`;
}

async function createArtistAndAssign(
  supabase: any,
  orgId: string,
  showId: string,
  artistName: string
): Promise<void> {
  try {
    // Create person as artist
    const { data: person, error: personError } = await supabase.rpc(
      "create_person",
      {
        p_org_id: orgId,
        p_name: artistName,
        p_email: null,
        p_phone: null,
        p_member_type: "artist",
      }
    );

    if (personError) {
      logger.error("Import commit: failed to create artist person", {
        artistName,
        error: personError,
      });
      return;
    }

    const personId = person?.id || person;
    if (!personId) {
      logger.warn("Import commit: create_person returned no id", { artistName });
      return;
    }

    // Assign to show
    const { error: assignError } = await supabase.rpc("assign_person_to_show", {
      p_show_id: showId,
      p_person_id: personId,
      p_duty: "Artist",
    });

    if (assignError) {
      logger.error("Import commit: failed to assign artist to show", {
        showId,
        personId,
        error: assignError,
      });
    } else {
      logger.info("Import commit: artist created and assigned", {
        showId,
        personId,
        artistName,
      });
    }
  } catch (err) {
    logger.error("Import commit: exception creating/assigning artist", err);
  }
}

async function persistHotels(
  supabase: any,
  orgId: string,
  showId: string,
  hotels: ImportedHotel[]
): Promise<void> {
  for (const hotel of hotels) {
    try {
      const checkInAt = buildTimestamp(hotel.checkInDate, hotel.checkInTime);
      const checkOutAt = buildTimestamp(hotel.checkOutDate, hotel.checkOutTime);

      const { error } = await supabase.rpc("create_lodging", {
        p_show_id: showId,
        p_person_id: null,
        p_hotel_name: hotel.name || null,
        p_address: hotel.address || null,
        p_city: hotel.city || null,
        p_country: hotel.country || null,
        p_check_in_at: checkInAt,
        p_check_out_at: checkOutAt,
        p_booking_refs: hotel.bookingReference ? [hotel.bookingReference] : [],
        p_phone: hotel.phone || null,
        p_email: hotel.email || null,
        p_notes: hotel.notes || null,
        p_source: "artist",
      });

      if (error) {
        logger.error("Import commit: failed to create lodging", {
          hotel: hotel.name,
          error,
        });
      } else {
        // Create schedule items for check-in and check-out
        const hotelName = hotel.name || "Hotel";

        if (checkInAt) {
          const checkInEnd = new Date(checkInAt);
          checkInEnd.setMinutes(checkInEnd.getMinutes() + 30);

          const { error: checkInError } = await supabase.rpc("create_schedule_item", {
            p_org_id: orgId,
            p_show_id: showId,
            p_title: `Hotel Check-in - ${hotelName}`,
            p_starts_at: checkInAt,
            p_ends_at: checkInEnd.toISOString(),
            p_location: hotel.address || hotel.city || null,
            p_item_type: "hotel",
            p_auto_generated: true,
            p_source: "import",
          });

          if (checkInError) {
            logger.error("Import commit: failed to create check-in schedule item", {
              hotel: hotelName,
              error: checkInError,
            });
          }
        }

        if (checkOutAt) {
          const checkOutEnd = new Date(checkOutAt);
          checkOutEnd.setMinutes(checkOutEnd.getMinutes() + 30);

          const { error: checkOutError } = await supabase.rpc("create_schedule_item", {
            p_org_id: orgId,
            p_show_id: showId,
            p_title: `Hotel Check-out - ${hotelName}`,
            p_starts_at: checkOutAt,
            p_ends_at: checkOutEnd.toISOString(),
            p_location: hotel.address || hotel.city || null,
            p_item_type: "hotel",
            p_auto_generated: true,
            p_source: "import",
          });

          if (checkOutError) {
            logger.error("Import commit: failed to create check-out schedule item", {
              hotel: hotelName,
              error: checkOutError,
            });
          }
        }
      }
    } catch (err) {
      logger.error("Import commit: exception creating lodging", err);
    }
  }
  logger.info("Import commit: hotels persisted", { count: hotels.length });
}

async function persistFlights(
  supabase: any,
  showId: string,
  flights: ImportedFlight[]
): Promise<void> {
  for (const flight of flights) {
    try {
      // departureTime and arrivalTime may contain full ISO timestamps or time-only strings
      // Try to parse them as timestamps first, fallback to using date from show if needed
      const departAt = flight.departureTime || null;
      const arrivalAt = flight.arrivalTime || null;
      
      // Infer direction from airport context if not explicitly set
      const direction = flight.direction || "arrival";

      const { error } = await supabase.rpc("create_flight", {
        p_show_id: showId,
        p_direction: direction,
        p_person_id: null,
        p_airline: flight.airline || null,
        p_flight_number: flight.flightNumber || null,
        p_booking_ref: flight.bookingReference || null,
        p_ticket_number: flight.ticketNumber || null,
        p_aircraft_model: flight.aircraft || null,
        p_passenger_name: flight.fullName || null,
        p_depart_airport_code: flight.fromAirport || null,
        p_depart_city: flight.fromCity || null,
        p_depart_at: departAt,
        p_arrival_airport_code: flight.toAirport || null,
        p_arrival_city: flight.toCity || null,
        p_arrival_at: arrivalAt,
        p_seat_number: flight.seat || null,
        p_travel_class: flight.travelClass || null,
        p_notes: flight.notes || null,
        p_source: "artist",
        p_auto_schedule: true,
      });

      if (error) {
        logger.error("Import commit: failed to create flight", {
          flight: flight.flightNumber,
          error,
        });
      }
    } catch (err) {
      logger.error("Import commit: exception creating flight", err);
    }
  }
  logger.info("Import commit: flights persisted", { count: flights.length });
}

async function persistFood(
  supabase: any,
  showId: string,
  food: ImportedFood[]
): Promise<void> {
  for (const item of food) {
    try {
      // serviceDate and serviceTime are optional extended fields
      const serviceAt = item.serviceDate 
        ? buildTimestamp(item.serviceDate, item.serviceTime)
        : null;

      const { error } = await supabase.rpc("create_catering", {
        p_show_id: showId,
        p_provider_name: item.name || null,
        p_address: item.address || null,
        p_city: item.city || null,
        p_service_at: serviceAt,
        p_guest_count: item.guestCount || null,
        p_booking_refs: item.bookingReference ? [item.bookingReference] : [],
        p_phone: item.phone || null,
        p_email: item.email || null,
        p_notes: item.notes || null,
        p_source: "artist",
      });

      if (error) {
        logger.error("Import commit: failed to create catering", {
          provider: item.name,
          error,
        });
      }
    } catch (err) {
      logger.error("Import commit: exception creating catering", err);
    }
  }
  logger.info("Import commit: food/catering persisted", { count: food.length });
}

async function persistDocuments(
  supabase: any,
  orgId: string,
  showId: string,
  documents: ImportedDocument[]
): Promise<void> {
  try {
    // Get or create advancing session
    const { data: session } = await supabase.rpc("get_or_create_show_advancing", {
      p_show_id: showId,
    });

    if (!session?.id) {
      logger.warn("Import commit: could not get advancing session for documents");
      return;
    }

    for (const doc of documents) {
      try {
        // Map category to party
        const party = doc.category === "contract" || doc.category === "rider" 
          ? "artist" 
          : "other";

        const { data: createdDoc, error: docError } = await supabase.rpc(
          "create_advancing_document",
          {
            p_show_id: showId,
            p_party: party,
            p_label: doc.fileName || "Imported Document",
            p_notes: doc.category ? `Category: ${doc.category}` : null,
          }
        );

        if (docError) {
          logger.error("Import commit: failed to create document", {
            fileName: doc.fileName,
            error: docError,
          });
          continue;
        }

        const documentId = createdDoc?.id || createdDoc;
        if (!documentId) continue;

        // Upload file metadata (actual file upload is separate)
        const { error: fileError } = await supabase.rpc("upload_advancing_file", {
          p_org_id: orgId,
          p_document_id: documentId,
          p_storage_path: `imports/${showId}/${doc.fileName}`,
          p_original_name: doc.fileName || "unknown",
          p_content_type: "application/octet-stream",
          p_size_bytes: doc.fileSize || 0,
        });

        if (fileError) {
          logger.error("Import commit: failed to upload file metadata", {
            fileName: doc.fileName,
            error: fileError,
          });
        }
      } catch (err) {
        logger.error("Import commit: exception creating document", err);
      }
    }

    logger.info("Import commit: documents persisted", { count: documents.length });
  } catch (err) {
    logger.error("Import commit: exception in persistDocuments", err);
  }
}

async function persistContacts(
  supabase: any,
  orgId: string,
  venueId: string | null,
  contacts: ImportedContact[]
): Promise<void> {
  for (const contact of contacts) {
    try {
      const { data: createdContact, error } = await supabase.rpc("create_contact", {
        p_org_id: orgId,
        p_name: contact.name || null,
        p_email: contact.email || null,
        p_phone: contact.phone || null,
        p_company: null,
        p_city: null,
        p_country: null,
        p_notes: contact.role ? `Role: ${contact.role}` : null,
        p_contact_type: "promoter",
        p_status: "active",
      });

      if (error) {
        logger.error("Import commit: failed to create contact", {
          contact: contact.name,
          error,
        });
        continue;
      }

      // Optionally link to venue if created
      if (venueId && createdContact?.id) {
        const contactId = createdContact.id || createdContact;
        await supabase.rpc("link_contact_to_venue", {
          p_venue_id: venueId,
          p_contact_id: contactId,
        });
      }
    } catch (err) {
      logger.error("Import commit: exception creating contact", err);
    }
  }
  logger.info("Import commit: contacts persisted", { count: contacts.length });
}

async function persistTechnical(
  supabase: any,
  showId: string,
  technical: ImportedTechnical
): Promise<void> {
  try {
    // Insert into promoter_requirements (no RPC; use direct insert under RLS)
    const { error } = await supabase
      .from("promoter_requirements")
      .insert({
        show_id: showId,
        backline: technical.backline || null,
        lighting: technical.lightingRequirements || null,
        soundcheck_notes: technical.soundcheck || null,
        green_room: technical.stageSetup || null,
        pa_monitors: technical.equipment || null,
        notes: technical.other || null,
      });

    if (error) {
      logger.error("Import commit: failed to insert technical requirements", error);
    } else {
      logger.info("Import commit: technical requirements persisted");
    }
  } catch (err) {
    logger.error("Import commit: exception persisting technical", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CommitRequest;
    const { intent, orgId, jobId, payload } = body || {};

    if (intent !== "commit") {
      return NextResponse.json({ error: "Unsupported intent" }, { status: 400 });
    }
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }
    if (!payload?.date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServer();

    // Verify user is authenticated (required for membership checks in RPCs)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      logger.error("Import commit: auth error", authError);
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isoDate = toISODate(payload.date);
    if (!isoDate) {
      logger.warn("Import commit: invalid date format", { date: payload.date });
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD (e.g., 2025-03-14)." },
        { status: 400 }
      );
    }

    const setTimeTs = buildSetTime(isoDate, payload.setTime || null);

    // Create show using RPC (app_create_show handles optional venue creation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: show, error: showError } = await (supabase as any).rpc(
      "app_create_show",
      {
        p_org_id: orgId,
        p_title: payload.title || payload.venueName || "Imported Show",
        p_date: isoDate,
        p_venue_id: null,
        p_venue_name: payload.venueName || null,
        p_venue_city: payload.city || null,
        p_venue_address: null,
        p_set_time: setTimeTs,
        p_notes: payload.notes || null,
      }
    );

    if (showError) {
      logger.error("Import commit: failed to create show", showError);
      return NextResponse.json(
        { error: showError.message || "Failed to create show" },
        { status: 500 }
      );
    }

    const showId = show?.id as string | undefined;
    const venueId = show?.venue_id as string | undefined;
    logger.info("Import commit: show created", { showId, venueId, orgId });

    if (!showId) {
      return NextResponse.json(
        { error: "Show creation returned no ID" },
        { status: 500 }
      );
    }

    // Persist artist if provided
    if (payload.artistName) {
      await createArtistAndAssign(supabase, orgId, showId, payload.artistName);
    }

    // Persist hotels
    if (payload.hotels?.length) {
      await persistHotels(supabase, orgId, showId, payload.hotels);
    }

    // Persist flights
    if (payload.flights?.length) {
      await persistFlights(supabase, showId, payload.flights);
    }

    // Persist food/catering
    if (payload.food?.length) {
      await persistFood(supabase, showId, payload.food);
    }

    // Persist documents
    if (payload.documents?.length) {
      await persistDocuments(supabase, orgId, showId, payload.documents);
    }

    // Persist contacts
    if (payload.contacts?.length) {
      await persistContacts(supabase, orgId, venueId || null, payload.contacts);
    }

    // Persist technical requirements
    if (payload.technical) {
      await persistTechnical(supabase, showId, payload.technical);
    }

    // If an import jobId is provided, mark it committed to this show
    if (jobId && showId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: commitError } = await (supabase as any).rpc(
        "app_mark_import_job_committed",
        {
          p_job_id: jobId,
          p_show_id: showId,
        }
      );

      if (commitError) {
        // Non-fatal: the show exists; log for follow-up
        logger.error("Import commit: failed to mark job committed", {
          jobId,
          showId,
          error: commitError,
        });
      } else {
        logger.info("Import commit: job marked committed", { jobId, showId });
      }
    }

    logger.info("Import commit: completed successfully", {
      showId,
      sections: {
        artist: !!payload.artistName,
        hotels: payload.hotels?.length || 0,
        flights: payload.flights?.length || 0,
        food: payload.food?.length || 0,
        documents: payload.documents?.length || 0,
        contacts: payload.contacts?.length || 0,
        technical: !!payload.technical,
      },
    });

    return NextResponse.json({ showId });
  } catch (error) {
    logger.error("Import commit: unexpected error", error);
    return NextResponse.json(
      { error: "Failed to save import" },
      { status: 500 }
    );
  }
}
