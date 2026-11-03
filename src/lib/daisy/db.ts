import { createClient } from "@supabase/supabase-js";
import type { Studio } from "./types";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définis dans .env.local");
}

// Clé secrète : ce fichier ne doit être importé que par des routes serveur
export const db = createClient(url, secretKey, { auth: { persistSession: false } });

type StudioRow = {
  id: string;
  public_key: string;
  allowed_origins: string[];
  name: string;
  timezone: string;
  currency: string;
  primary_color: string;
  logo_url: string | null;
  requires_phone: boolean;
  cancellation_hours: number;
  max_seats_per_booking: number;
};

export type StudioRecord = Studio & { allowed_origins: string[] };

export async function findStudio(req: Request): Promise<StudioRecord | null> {
  const publicKey = req.headers.get("x-daisy-key");
  if (!publicKey) return null;

  const { data, error } = await db
    .from("studios")
    .select("*")
    .eq("public_key", publicKey)
    .maybeSingle<StudioRow>();

  if (error) throw error;
  if (!data) return null;

  return {
    studio_id: data.id,
    name: data.name,
    timezone: data.timezone,
    currency: data.currency,
    branding: { primary_color: data.primary_color, logo_url: data.logo_url },
    booking_policy: {
      requires_phone: data.requires_phone,
      cancellation_hours: data.cancellation_hours,
      max_seats_per_booking: data.max_seats_per_booking,
    },
    allowed_origins: data.allowed_origins,
  };
}