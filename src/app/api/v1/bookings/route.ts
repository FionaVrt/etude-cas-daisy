import { NextResponse } from "next/server";
import { findSlot } from "@/lib/daisy/mock-data";
import { apiError, checkHost, delay, findStudio } from "@/lib/daisy/mock-server";
import type { BookingRequest, BookingResponse } from "@/lib/daisy/types";

const RATE_LIMIT = 20;
const HOUR_MS = 60 * 60 * 1000;
const requestsByIp = new Map<string, number[]>();
const idempotencyStore = new Map<string, BookingResponse>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (requestsByIp.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  recent.push(now);
  requestsByIp.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

function confirmationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I
  const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]);
  return `DY-${code.join("")}`;
}

export async function POST(req: Request) {
  await delay(1500, 4000); // latence réelle de l'API

  const studio = findStudio(req);
  if (!studio) return apiError(401, "invalid_key");
  const denied = checkHost(req, studio);
  if (denied) return denied;

  // Idempotence : même clé = même réponse, pas de doublon
  const idemKey = req.headers.get("idempotency-key");
  if (idemKey) {
    const previous = idempotencyStore.get(idemKey);
    if (previous) return NextResponse.json(previous, { status: 201 });
  }

  // Scénarios forcés pour tester le widget
  const scenario = req.headers.get("x-mock-scenario");
  if (scenario === "slot_full") return apiError(409, "slot_full", { available: 0 });
  if (scenario === "slot_cancelled") return apiError(409, "slot_cancelled");
  if (scenario === "rate_limited") return apiError(429, "rate_limited");
  if (scenario === "origin_not_allowed") return apiError(403, "origin_not_allowed");

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

  const slot = findSlot(studio.courses, body.slot_id);
  if (!slot) return apiError(404, "not_found");

  const policy = studio.booking_policy;
  if (body.seats > policy.max_seats_per_booking) return apiError(422, "too_many_seats");
  if (policy.requires_phone && !c.phone?.trim()) return apiError(422, "phone_required");
  if (body.seats > slot.seats_available) {
    return apiError(409, "slot_full", { available: slot.seats_available });
  }

  // Vérification et décrément sans await entre les deux : pas de survente
  slot.seats_available -= body.seats;

  const booking: BookingResponse = {
    booking_id: `bkg_${Date.now()}`,
    status: "confirmed",
    confirmation_code: confirmationCode(),
    total_cents: slot.price_cents * body.seats,
  };

  if (idemKey) idempotencyStore.set(idemKey, booking);
  return NextResponse.json(booking, { status: 201 });
}