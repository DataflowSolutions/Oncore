// API Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
  details?: any;
}

// Re-export specific types
export * from "./show.types";
export * from "./venue.types";
