// Shows Routes
// Maps HTTP endpoints to controller methods

import { NextRequest } from "next/server";
import { ShowsController } from "../controllers/shows.controller";

export async function GET(
  request: NextRequest,
  context?: { params: { id?: string } }
) {
  // Check if this is a specific show request or list request
  if (context?.params?.id) {
    return ShowsController.getById(request, { id: context.params.id });
  }

  // Check for special routes
  const { pathname } = new URL(request.url);

  if (pathname.endsWith("/upcoming")) {
    return ShowsController.upcoming(request);
  }

  // Default to list
  return ShowsController.list(request);
}

export async function POST(request: NextRequest) {
  return ShowsController.create(request);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return ShowsController.update(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return ShowsController.delete(request, context.params);
}
