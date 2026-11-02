import { NextResponse } from "next/server";
import { getSlotsForCourse } from "@/lib/daisy/mock-data";
import { apiError, checkHost, delay, findStudio } from "@/lib/daisy/mock-server";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  await delay(300, 900);
  const studio = findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  const { courseId } = await params;
  const course = studio.courses.find((c) => c.course_id === courseId);
  if (!course) return apiError(404, "not_found");

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

  const slots = getSlotsForCourse(course).filter((s) => {
    const start = new Date(s.starts_at);
    return start >= from && start <= to;
  });

  return NextResponse.json({ slots });
}