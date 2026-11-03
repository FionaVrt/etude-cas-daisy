import { NextResponse } from "next/server";
import { db, findStudio } from "@/lib/daisy/db";
import { apiError, checkHost, delay } from "@/lib/daisy/mock-server";
import type { BookingRequest } from "@/lib/daisy/types";

// Limite : en mémoire, donc par instance serveur (voir README)
const RATE_LIMIT = 20;
const HOUR_MS = 60 * 60 * 1000;
const requestsByIp = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// Traduction des erreurs de create_booking en codes HTTP
const STATUS_BY_ERROR: Record<string, number> = {
  invalid_key: 401,
  not_found: 404,
  slot_full: 409,
  slot_cancelled: 409,
  phone_required: 422,
  too_many_seats: 422,
};

export async function POST(req: Request) {
  // Latence documentée de l'API réelle (écriture, partenaires, e-mail synchrone)
  await delay(1500, 4000);

  const studio = await findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  // Scénarios forcés pour tester le widget
  const scenario = req.headers.get("x-mock-scenario");
  if (scenario === "slot_full") return apiError(409, "slot_full", { available: 0 });
  if (scenario === "slot_cancelled") return apiError(409, "slot_cancelled");
  if (scenario === "rate_limited") return apiError(429, "rate_limited");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (isRateLimited(ip)) return apiError(429, "rate_limited");

  let body: BookingRequest;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_body");
  }

  const c = body?.customer;
  if (
    !body?.slot_id ||
    !Number.isInteger(body.seats) ||
    body.seats < 1 ||
    !c?.first_name?.trim() ||
    !c?.last_name?.trim() ||
    !c?.email?.trim()
  ) {
    return apiError(400, "invalid_body");
  }

  // Contrôles, décrément atomique et idempotence : tout se passe en base
  const { data, error } = await db.rpc("create_booking", {
    p_public_key: req.headers.get("x-daisy-key"),
    p_slot_id: body.slot_id,
    p_seats: body.seats,
    p_first_name: c.first_name.trim(),
    p_last_name: c.last_name.trim(),
    p_email: c.email.trim(),
    p_phone: c.phone ?? null,
    p_notes: body.notes ?? null,
    p_idempotency_key: req.headers.get("idempotency-key"),
  });

  if (error) return apiError(500, "server_error");

  if (data?.error) {
    const { error: code, ...extra } = data;
    return apiError(STATUS_BY_ERROR[code] ?? 500, code, extra);
  }

  return NextResponse.json(data, { status: 201 });
}