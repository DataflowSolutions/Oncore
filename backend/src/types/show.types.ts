// Backend Types - Show
// These types are shared between frontend and backend

export interface Show {
  id: string;
  org_id: string;
  title: string;
  date: string;
  set_time?: string | null;
  doors_at?: string | null;
  venue_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShowWithVenue extends Show {
  venue?: {
    id: string;
    name: string;
    city: string;
    state?: string | null;
    country?: string | null;
    address?: string | null;
  } | null;
}

export interface CreateShowRequest {
  org_id: string;
  title: string;
  date: string;
  set_time?: string;
  doors_at?: string;
  venue_id?: string;
  notes?: string;
  // For inline venue creation
  venue_name?: string;
  venue_city?: string;
  venue_state?: string;
  venue_address?: string;
}

export interface UpdateShowRequest {
  title?: string;
  date?: string;
  set_time?: string;
  doors_at?: string;
  venue_id?: string;
  notes?: string;
}

export interface ShowsListParams {
  org_id: string;
  upcoming?: boolean;
  limit?: number;
  offset?: number;
}

export interface ShowResponse {
  success: boolean;
  data: Show | ShowWithVenue;
  error?: string;
}

export interface ShowsListResponse {
  success: boolean;
  data: ShowWithVenue[];
  total?: number;
  error?: string;
}
