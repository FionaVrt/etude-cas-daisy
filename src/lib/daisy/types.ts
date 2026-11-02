export type Studio = {
  studio_id: string;
  name: string;
  timezone: string;
  currency: string;
  branding: { primary_color: string; logo_url: string | null };
  booking_policy: {
    requires_phone: boolean;
    cancellation_hours: number;
    max_seats_per_booking: number;
  };
};

export type Course = {
  course_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  image_url: string | null;
  level: string;
};

export type Slot = {
  slot_id: string;
  starts_at: string;
  seats_total: number;
  seats_available: number;
  price_cents: number;
};

export type BookingRequest = {
  slot_id: string;
  seats: number;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  notes?: string;
};

export type BookingResponse = {
  booking_id: string;
  status: "confirmed";
  confirmation_code: string;
  total_cents: number;
};

export type DaisyError = {
  error:
    | "slot_full"
    | "slot_cancelled"
    | "phone_required"
    | "too_many_seats"
    | "rate_limited"
    | "origin_not_allowed"
    | "invalid_key"
    | "invalid_window"
    | "not_found"
    | "invalid_body";
  available?: number;
};