import { NextResponse } from "next/server";
import { studios } from "./mock-data";

export function findStudio(req: Request) {
  const key = req.headers.get("x-daisy-key");
  return studios.find((s) => s.public_key === key) ?? null;
}

export function checkHost(req: Request, studio: { allowed_origins: string[] }) {
  const host = req.headers.get("x-daisy-host");
  if (!host) return null;
  return studio.allowed_origins.includes("*") || studio.allowed_origins.includes(host)
    ? null
    : apiError(403, "origin_not_allowed");
}

export function apiError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

// Latence simulée, pour voir les états de chargement
export function delay(minMs: number, maxMs: number) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}