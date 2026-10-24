export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import {
  locationResponse,
  type LocationRouteContext,
} from "@/features/find-twin/server/http";
import type { NextRequest } from "next/server";
export function POST(request: NextRequest, context: LocationRouteContext) {
  return locationResponse(request, context, "respond");
}
