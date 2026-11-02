import type { BookingRequest, BookingResponse, Course, DaisyError, Slot, Studio } from "./types";

export class DaisyApiError extends Error {
  status: number;
  body: DaisyError | null;
  constructor(status: number, body: DaisyError | null) {
    super(body?.error ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {}

export function createDaisyClient(studioKey: string, host: string | null) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("x-daisy-key", studioKey);
    if (host) headers.set("x-daisy-host", host);

    let res: Response;
    try {
      res = await fetch(`/api/v1${path}`, { ...init, headers });
    } catch {
      throw new NetworkError("Réseau indisponible");
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as DaisyError | null;
      throw new DaisyApiError(res.status, body);
    }
    return (await res.json()) as T;
  }

  return {
    getStudio: () => request<Studio>("/studio"),
    getCourses: () => request<{ courses: Course[] }>("/courses"),
    getSlots: (courseId: string, from: Date, to: Date) =>
      request<{ slots: Slot[] }>(
        `/courses/${encodeURIComponent(courseId)}/slots?from=${from.toISOString()}&to=${to.toISOString()}`
      ),
    createBooking: (body: BookingRequest, idempotencyKey: string) =>
      request<BookingResponse>("/bookings", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
      }),
  };
}

export type DaisyClient = ReturnType<typeof createDaisyClient>;