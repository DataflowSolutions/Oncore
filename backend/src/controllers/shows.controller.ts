// Shows Controller - Request/Response Handler
// This controller handles HTTP requests and responses
// It validates input, calls service methods, and formats responses

import { NextRequest, NextResponse } from "next/server";
import { ShowsService } from "../services/shows.service";
import { createSupabaseClientWithAuth } from "../utils/supabase";
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
} from "../utils/response";
import {
  validate,
  createShowSchema,
  updateShowSchema,
  uuidSchema,
} from "../utils/validation";
import { ApiError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { HTTP_STATUS } from "../config/constants";
import type {
  CreateShowRequest,
  UpdateShowRequest,
  ShowsListParams,
} from "../types";

export class ShowsController {
  /**
   * GET /api/shows
   * List all shows for an organization
   */
  static async list(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract query parameters
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("org_id");
      const upcoming = searchParams.get("upcoming") === "true";
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = parseInt(searchParams.get("offset") || "0");

      // Validate required parameters
      if (!orgId) {
        return NextResponse.json(
          errorResponse("org_id is required", HTTP_STATUS.BAD_REQUEST),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      validate(uuidSchema, orgId);

      // Get auth token from request
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token);

      // Call service
      const service = new ShowsService(supabase);
      const params: ShowsListParams = {
        org_id: orgId,
        upcoming,
        limit,
        offset,
      };
      const shows = await service.getShowsByOrg(params);

      return NextResponse.json(successResponse(shows));
    } catch (error) {
      return ShowsController.handleError(error);
    }
  }

  /**
   * GET /api/shows/:id
   * Get a single show by ID
   */
  static async getById(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse> {
    try {
      const showId = params.id;
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("org_id");

      // Validate parameters
      if (!orgId) {
        return NextResponse.json(
          errorResponse("org_id is required", HTTP_STATUS.BAD_REQUEST),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      validate(uuidSchema, showId);
      validate(uuidSchema, orgId);

      // Get auth token
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token);

      // Call service
      const service = new ShowsService(supabase);
      const show = await service.getShowById(showId, orgId);

      return NextResponse.json(successResponse(show));
    } catch (error) {
      return ShowsController.handleError(error);
    }
  }

  /**
   * POST /api/shows
   * Create a new show
   */
  static async create(request: NextRequest): Promise<NextResponse> {
    try {
      // Parse request body
      const body = await request.json();

      // Validate input
      const validatedData = validate(createShowSchema, body);

      // Get auth token
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token);

      // Call service
      const service = new ShowsService(supabase);
      const show = await service.createShow(validatedData as CreateShowRequest);

      return NextResponse.json(
        createdResponse(show, "Show created successfully"),
        { status: HTTP_STATUS.CREATED }
      );
    } catch (error) {
      return ShowsController.handleError(error);
    }
  }

  /**
   * PATCH /api/shows/:id
   * Update an existing show
   */
  static async update(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse> {
    try {
      const showId = params.id;
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("org_id");

      // Validate parameters
      if (!orgId) {
        return NextResponse.json(
          errorResponse("org_id is required", HTTP_STATUS.BAD_REQUEST),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      validate(uuidSchema, showId);
      validate(uuidSchema, orgId);

      // Parse and validate request body
      const body = await request.json();
      const validatedData = validate(updateShowSchema, body);

      // Get auth token
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token);

      // Call service
      const service = new ShowsService(supabase);
      const show = await service.updateShow(
        showId,
        orgId,
        validatedData as UpdateShowRequest
      );

      return NextResponse.json(
        successResponse(show, "Show updated successfully")
      );
    } catch (error) {
      return ShowsController.handleError(error);
    }
  }

  /**
   * DELETE /api/shows/:id
   * Delete a show
   */
  static async delete(
    request: NextRequest,
    params: { id: string }
  ): Promise<NextResponse> {
    try {
      const showId = params.id;
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("org_id");

      // Validate parameters
      if (!orgId) {
        return NextResponse.json(
          errorResponse("org_id is required", HTTP_STATUS.BAD_REQUEST),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      validate(uuidSchema, showId);
      validate(uuidSchema, orgId);

      // Get auth token
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token);

      // Call service
      const service = new ShowsService(supabase);
      await service.deleteShow(showId, orgId);

      return NextResponse.json(noContentResponse("Show deleted successfully"), {
        status: HTTP_STATUS.OK,
      });
    } catch (error) {
      return ShowsController.handleError(error);
    }
  }

  /**
   * GET /api/shows/upcoming
   * Get upcoming shows
   */
  static async upcoming(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      const orgId = searchParams.get("org_id");
      const limit = parseInt(searchParams.get("limit") || "10");

      if (!orgId) {
        return NextResponse.json(
          errorResponse("org_id is required", HTTP_STATUS.BAD_REQUEST),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      validate(uuidSchema, orgId);

      // Get auth token
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          errorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED),
          { status: HTTP_STATUS.UNAUTHORIZED }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const supabase = createSupabaseClientWithAuth(token);

      const service = new ShowsService(supabase);
      const shows = await service.getUpcomingShows(orgId, limit);

      return NextResponse.json(successResponse(shows));
    } catch (error) {
      return ShowsController.handleError(error);
    }
  }

  /**
   * Centralized error handler
   */
  private static handleError(error: unknown): NextResponse {
    console.error("Controller error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(errorResponse(error.message, error.statusCode), {
        status: error.statusCode,
      });
    }

    if (error instanceof Error) {
      return NextResponse.json(
        errorResponse(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR),
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      errorResponse(
        "An unexpected error occurred",
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      ),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
