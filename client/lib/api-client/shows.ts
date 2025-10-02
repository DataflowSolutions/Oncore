// Shows API Client
// Type-safe API calls for shows

import { apiClient, ApiClient } from "./index";
import type {
  ShowWithVenue,
  CreateShowRequest,
  UpdateShowRequest,
  ShowsListParams,
  ApiResponse,
  ShowsListResponse,
} from "@/../backend/src/types";

export class ShowsApi {
  constructor(private client: ApiClient = apiClient) {}

  /**
   * Get all shows for an organization
   */
  async list(params: ShowsListParams): Promise<ShowWithVenue[]> {
    const response = await this.client.get<ApiResponse<ShowWithVenue[]>>(
      "/shows",
      params
    );
    return response.data || [];
  }

  /**
   * Get a single show by ID
   */
  async getById(id: string, orgId: string): Promise<ShowWithVenue> {
    const response = await this.client.get<ApiResponse<ShowWithVenue>>(
      `/shows/${id}`,
      { org_id: orgId }
    );
    if (!response.data) {
      throw new Error("Show not found");
    }
    return response.data;
  }

  /**
   * Create a new show
   */
  async create(data: CreateShowRequest): Promise<ShowWithVenue> {
    const response = await this.client.post<ApiResponse<ShowWithVenue>>(
      "/shows",
      data
    );
    if (!response.data) {
      throw new Error("Failed to create show");
    }
    return response.data;
  }

  /**
   * Update an existing show
   */
  async update(
    id: string,
    orgId: string,
    data: UpdateShowRequest
  ): Promise<ShowWithVenue> {
    const response = await this.client.patch<ApiResponse<ShowWithVenue>>(
      `/shows/${id}?org_id=${orgId}`,
      data
    );
    if (!response.data) {
      throw new Error("Failed to update show");
    }
    return response.data;
  }

  /**
   * Delete a show
   */
  async delete(id: string, orgId: string): Promise<void> {
    await this.client.delete<ApiResponse>(`/shows/${id}?org_id=${orgId}`);
  }

  /**
   * Get upcoming shows
   */
  async getUpcoming(
    orgId: string,
    limit: number = 10
  ): Promise<ShowWithVenue[]> {
    const response = await this.client.get<ApiResponse<ShowWithVenue[]>>(
      "/shows/upcoming",
      { org_id: orgId, limit }
    );
    return response.data || [];
  }
}

// Export a default instance
export const showsApi = new ShowsApi();
