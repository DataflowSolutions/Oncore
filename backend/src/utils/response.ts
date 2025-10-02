// API Response Helpers

import { ApiResponse, PaginatedResponse } from "../types";

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(error: string, statusCode: number = 500) {
  return {
    success: false,
    error,
    statusCode,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export function createdResponse<T>(
  data: T,
  message: string = "Resource created successfully"
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function noContentResponse(
  message: string = "Operation completed successfully"
): ApiResponse {
  return {
    success: true,
    message,
  };
}
