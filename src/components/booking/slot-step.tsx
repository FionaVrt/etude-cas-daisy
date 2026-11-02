"use client";

import { useEffect, useState } from "react";
import type { DaisyClient } from "@/lib/daisy/client";
import type { Course, Slot, Studio } from "@/lib/daisy/types";
import { formatPrice, formatSlotDay, formatSlotTime } from "@/lib/format";

type Props = {
  client: DaisyClient;
  studio: Studio;
  course: Course;
  onSelect: (slot: Slot) => void;
};

const WINDOW_MS = 28 * 24 * 60 * 60 * 1000; // 4 semaines par chargement
const MAX_WINDOWS = 6; // ~6 mois, bien au-delà de l'usage réel

export function SlotStep({ client, studio, course, onSelect }: Props) {
  const [start] = useState(() => Date.now());
  const [windows, setWindows] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const from = new Date(start + (windows - 1) * WINDOW_MS);
    const to = new Date(start + windows * WINDOW_MS);

    client.getSlots(course.course_id, from, to).then(
      ({ slots: page }) => {
        if (cancelled) return;
        setSlots((prev) => {
          const known = new Set(prev.map((s) => s.slot_id));
          return [...prev, ...page.filter((s) => !known.has(s.slot_id))].sort((a, b) =>
            a.starts_at.localeCompare(b.starts_at)
          );
        });
        setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("error");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [client, course.course_id, start, windows, attempt]);

  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const groups = groupByDay(slots, studio.timezone);

  return (
    <div className="space-y-4">
      {visitorTz !== studio.timezone && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Horaires indiqués à l&apos;heure de l&apos;atelier ({studio.timezone.split("/")[1]}).
        </p>
      )}

      {groups.map(([day, daySlots]) => (
        <section key={day}>
          <h3 className="mb-2 text-sm font-medium capitalize text-neutral-600">{day}</h3>
          <ul className="space-y-2">
            {daySlots.map((slot) => (
              <li key={slot.slot_id}>
                <SlotButton slot={slot} studio={studio} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {status === "ready" && slots.length === 0 && (
        <p className="text-neutral-600">Aucun créneau sur les prochaines semaines.</p>
      )}

      {status === "loading" && (
        <ul className="space-y-2" aria-busy="true" aria-label="Chargement des créneaux">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </ul>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p>Impossible de charger les créneaux. Vérifiez votre connexion.</p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setAttempt((n) => n + 1);
            }}
            className="rounded-md bg-neutral-900 px-4 py-2 text-white"
          >
            Réessayer
          </button>
        </div>
      )}

      {status === "ready" && windows < MAX_WINDOWS && (
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            setWindows((w) => w + 1);
          }}
          className="w-full rounded-md border border-neutral-300 px-4 py-2 text-sm"
        >
          Dates suivantes
        </button>
      )}
    </div>
  );
}

function SlotButton({
  slot,
  studio,
  onSelect,
}: {
  slot: Slot;
  studio: Studio;
  onSelect: (slot: Slot) => void;
}) {
  const full = slot.seats_available === 0;
  const fewLeft = !full && slot.seats_available <= 2;

  return (
    <button
      type="button"
      disabled={full}
      onClick={() => onSelect(slot)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-left transition-colors enabled:hover:border-[var(--daisy-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--daisy-primary)] disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
    >
      <span className="font-medium">{formatSlotTime(slot.starts_at, studio.timezone)}</span>
      <span className="text-right text-sm">
        {full ? (
          "Complet"
        ) : (
          <>
            {formatPrice(slot.price_cents, studio.currency)}
            {fewLeft && (
              <span className="block text-xs text-amber-700">
                Plus que {slot.seats_available} place{slot.seats_available > 1 ? "s" : ""}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  );
}

function groupByDay(slots: Slot[], timeZone: string): [string, Slot[]][] {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const day = formatSlotDay(slot.starts_at, timeZone);
    groups.set(day, [...(groups.get(day) ?? []), slot]);
  }
  return [...groups.entries()];
}