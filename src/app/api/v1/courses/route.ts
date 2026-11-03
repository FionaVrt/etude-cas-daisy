import { NextResponse } from "next/server";
import { db, findStudio } from "@/lib/daisy/db";
import { apiError, checkHost } from "@/lib/daisy/mock-server";

export async function GET(req: Request) {
  const studio = await findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  const { data, error } = await db
    .from("courses")
    .select("id, name, description, duration_minutes, price_cents, image_url, level")
    .eq("studio_id", studio.studio_id)
    .order("position");

  if (error) return apiError(500, "server_error");

  return NextResponse.json({
    courses: data.map(({ id, ...rest }) => ({ course_id: id, ...rest })),
  });
}