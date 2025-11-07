export interface ErrorResponse {
  error: string
  details?: string
}

export interface SuccessResponse<T = unknown> {
  success: true
  data: T
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

export const createErrorResponse = (error: string, details?: string, status = 400): Response => {
  return new Response(
    JSON.stringify({ error, details } as ErrorResponse),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export const createSuccessResponse = <T>(data: T, status = 200): Response => {
  return new Response(
    JSON.stringify({ success: true, data } as SuccessResponse<T>),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
