-- Add extended fact types to import_fact_type enum
-- These enable extraction of more detailed flight, hotel, technical, and catering fields

-- Flight fields
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_origin_city';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_origin_airport';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_destination_city';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_destination_airport';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_departure_datetime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_arrival_datetime';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_airline';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_passenger_name';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_booking_reference';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_ticket_number';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_seat';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_class';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_aircraft_model';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'flight_duration';

-- Hotel fields
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_city';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_country';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_booking_reference';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_phone';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_email';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'hotel_notes';

-- Technical fields (granular)
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_equipment_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_backline_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_stage_setup_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_lighting_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_soundcheck_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'technical_other_summary';

-- Catering / food provider fields
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_provider_name';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_provider_address';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_provider_city';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_provider_country';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_provider_phone';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_provider_email';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'catering_booking_reference';

-- Transfer / ground transport
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'transfer_summary';
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'ground_transport_summary';

-- Deal fields
ALTER TYPE import_fact_type ADD VALUE IF NOT EXISTS 'deal_notes';
