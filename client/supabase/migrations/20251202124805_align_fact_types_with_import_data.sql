-- Align import_fact_type enum with ImportData structure
-- This ensures all fields in the import confirmation UI can be extracted by AI

-- =============================================================================
-- GENERAL SECTION
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_artist';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_eventName';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_venue';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_date';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_setTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_city';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'general_country';

-- =============================================================================
-- DEAL SECTION
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'deal_fee';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'deal_paymentTerms';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'deal_dealType';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'deal_currency';
-- deal_notes already exists

-- =============================================================================
-- HOTEL SECTION
-- =============================================================================
-- hotel_name, hotel_address, hotel_city, hotel_country already exist
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_checkInDate';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_checkInTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_checkOutDate';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_checkOutTime';
-- hotel_bookingReference, hotel_phone, hotel_email, hotel_notes already exist

-- =============================================================================
-- FOOD/CATERING SECTION (replaces catering_* with food_*)
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_name';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_address';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_city';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_country';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_bookingReference';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_phone';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_email';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_notes';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_serviceDate';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_serviceTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'food_guestCount';

-- =============================================================================
-- FLIGHT SECTION (aligned with ImportedFlight fields)
-- =============================================================================
-- flight_airline already exists
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_flightNumber';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_aircraft';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_fullName';
-- flight_booking_reference exists, add camelCase version
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_bookingReference';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_ticketNumber';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_fromCity';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_fromAirport';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_departureTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_toCity';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_toAirport';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_arrivalTime';
-- flight_seat already exists
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_travelClass';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_flightTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_direction';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_notes';

-- =============================================================================
-- ACTIVITY SECTION
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_name';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_location';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_startTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_endTime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_notes';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_hasDestination';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_destinationName';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'activity_destinationLocation';

-- =============================================================================
-- CONTACT SECTION
-- =============================================================================
-- contact_name, contact_email, contact_phone, contact_role already exist

-- =============================================================================
-- TECHNICAL SECTION (aligned with ImportedTechnical fields)
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_equipment';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_backline';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_stageSetup';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_lightingRequirements';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_soundcheck';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_other';

-- =============================================================================
-- DOCUMENT SECTION
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'document_category';

-- =============================================================================
-- FALLBACK
-- =============================================================================
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'other';
