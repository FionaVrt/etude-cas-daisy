import { NextResponse } from "next/server";
import { db, findStudio } from "@/lib/daisy/db";
import { apiError, checkHost } from "@/lib/daisy/mock-server";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const studio = await findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  const { courseId } = await params;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date(from.getTime() + 30 * DAY_MS);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return apiError(400, "invalid_window");
  }
  if (to.getTime() - from.getTime() > 90 * DAY_MS) {
    return apiError(400, "invalid_window");
  }

  // Le cours doit appartenir à l'atelier de la clé
  const { data: course } = await db
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("studio_id", studio.studio_id)
    .maybeSingle();
  if (!course) return apiError(404, "not_found");

  const { data, error } = await db
    .from("slots")
    .select("id, starts_at, seats_total, seats_available, price_cents")
    .eq("course_id", courseId)
    .eq("cancelled", false)
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at");

  if (error) return apiError(500, "server_error");

  return NextResponse.json({
    slots: data.map(({ id, ...rest }) => ({ slot_id: id, ...rest })),
  });
}