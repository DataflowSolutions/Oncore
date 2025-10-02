// Next.js API Route Handler for Shows (Dynamic ID)
// Path: client/app/api/shows/[id]/route.ts

import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "@/../backend/src/routes/shows.routes";

export { GET, PATCH, DELETE };

// Export route config
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
