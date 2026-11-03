import { NextResponse } from "next/server";
import { findStudio } from "@/lib/daisy/db";
import { apiError, checkHost } from "@/lib/daisy/mock-server";

export async function GET(req: Request) {
  const studio = await findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  return NextResponse.json({
    studio_id: studio.studio_id,
    name: studio.name,
    timezone: studio.timezone,
    currency: studio.currency,
    branding: studio.branding,
    booking_policy: studio.booking_policy,
  });
}