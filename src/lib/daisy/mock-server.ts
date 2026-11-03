import { NextResponse } from "next/server";

export function apiError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function delay(minMs: number, maxMs: number) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function checkHost(req: Request, studio: { allowed_origins: string[] }) {
  const host = req.headers.get("x-daisy-host");
  // Pas de host : page ouverte directement sur le domaine Daisy (lien de secours)
  if (!host) return null;
  return studio.allowed_origins.includes(host) ? null : apiError(403, "origin_not_allowed");
}