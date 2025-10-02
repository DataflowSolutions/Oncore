// Venue Types

export interface Venue {
  id: string;
  org_id: string;
  name: string;
  city: string;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  capacity?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueWithShowCount extends Venue {
  show_count: number;
}

export interface CreateVenueRequest {
  org_id: string;
  name: string;
  city: string;
  state?: string;
  country?: string;
  address?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateVenueRequest {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  capacity?: number;
  notes?: string;
}

export interface VenueSearchParams {
  org_id?: string;
  query?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}
