import { NextResponse } from "next/server";
import { apiError, checkHost, delay, findStudio } from "@/lib/daisy/mock-server";

export async function GET(req: Request) {
  await delay(200, 600);
  const studio = findStudio(req);
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