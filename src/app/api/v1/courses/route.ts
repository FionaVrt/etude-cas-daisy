import { NextResponse } from "next/server";
import { apiError, checkHost, delay, findStudio } from "@/lib/daisy/mock-server";

export async function GET(req: Request) {
  await delay(300, 800);
  const studio = findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  return NextResponse.json({ courses: studio.courses });
}