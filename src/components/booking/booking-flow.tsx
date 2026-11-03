"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DaisyClient } from "@/lib/daisy/client";
import type { BookingRequest, BookingResponse, Course, Slot, Studio } from "@/lib/daisy/types";
import { formatPrice, formatSlotDay, formatSlotTime } from "@/lib/format";
import { buildTheme } from "@/lib/theme";
import { CourseStep } from "./course-step";
import { DaisyApiError, NetworkError } from "@/lib/daisy/client";
import { SlotStep } from "./slot-step";
import { DetailsStep, EMPTY_DRAFT, type CustomerDraft } from "./details-step";

type Step =
  | { name: "course" }
  | { name: "slot"; course: Course }
  | { name: "details"; course: Course; slot: Slot }
  | { name: "sending"; course: Course; slot: Slot }
  | {
      name: "confirmed";
      course: Course;
      slot: Slot;
      booking: BookingResponse;
      seats: number;
      email: string;
    };

const TITLES: Record<Step["name"], string> = {
  course: "Choisissez un cours",
  slot: "Choisissez un créneau",
  details: "Vos coordonnées",
  sending: "Réservation en cours",
  confirmed: "C'est réservé !",
};

export function BookingFlow({ client, studio }: { client: DaisyClient; studio: Studio }) {
  const [step, setStep] = useState<Step>({ name: "course" });
  // Les coordonnées vivent ici : elles survivent aux allers-retours entre étapes
  const [draft, setDraft] = useState<CustomerDraft>(EMPTY_DRAFT);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const theme = useMemo(() => buildTheme(studio.branding.primary_color), [studio]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Idempotence : même demande = même clé, y compris après une coupure réseau
  const idempotencyKey = useRef<string | null>(null);
  const lastPayload = useRef<string | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // pas au chargement : on ne vole pas le focus de l'hôte
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    // "*" acceptable : le message ne contient aucune donnée
    window.parent.postMessage({ type: "daisy:step" }, "*");
  }, [step]);

  async function send(final: CustomerDraft, course: Course, slot: Slot) {
    const payload: BookingRequest = {
      slot_id: slot.slot_id,
      seats: final.seats,
      customer: {
        first_name: final.first_name,
        last_name: final.last_name,
        email: final.email,
        ...(final.phone ? { phone: final.phone } : {}),
      },
      ...(final.notes ? { notes: final.notes } : {}),
    };

    const signature = JSON.stringify(payload);
    if (signature !== lastPayload.current || !idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
      lastPayload.current = signature;
    }

    setSubmitError(null);
    setStep({ name: "sending", course, slot });

    try {
      const booking = await client.createBooking(payload, idempotencyKey.current);
      idempotencyKey.current = null; // réservation faite : la prochaine sera nouvelle
      lastPayload.current = null;
      setStep({ name: "confirmed", course, slot, booking, seats: final.seats, email: final.email });
      window.parent.postMessage({ type: "daisy:booking_confirmed" }, "*");
    } catch (err) {
      const when = `${formatSlotDay(slot.starts_at, studio.timezone)} à ${formatSlotTime(
        slot.starts_at,
        studio.timezone
      )}`;

      if (err instanceof DaisyApiError && err.body?.error === "slot_full") {
        const available = err.body.available ?? 0;

        if (available > 0) {
          setDraft((d) => ({ ...d, seats: Math.min(d.seats, available) }));
          setSubmitError(
            `Il ne reste plus que ${available} place${available > 1 ? "s" : ""} sur ce créneau. ` +
              "Nous avons ajusté votre réservation : vérifiez le total, puis confirmez."
          );
          setStep({ name: "details", course, slot: { ...slot, seats_available: available } });
          return;
        }

        setSlotNotice(
          `Dommage, la dernière place du ${when} vient d'être réservée par quelqu'un d'autre. ` +
            "Vos coordonnées sont gardées : choisissez un autre créneau, il ne vous restera qu'à confirmer."
        );
        setStep({ name: "slot", course });
        return;
      }

      if (err instanceof DaisyApiError && err.body?.error === "slot_cancelled") {
        setSlotNotice(
          `L'atelier vient d'annuler le créneau du ${when}. ` +
            "Vos coordonnées sont gardées : choisissez une autre date."
        );
        setStep({ name: "slot", course });
        return;
      }

      setSubmitError(describeError(err, studio));
      setStep({ name: "details", course, slot });
    }
  }

  function restart() {
    // On garde l'identité, on remet à zéro ce qui dépend du cours
    setDraft((d) => ({ ...d, seats: 1, notes: "" }));
    setSubmitError(null);
    setSlotNotice(null);
    setStep({ name: "course" });
  }

    return (
    <div
      style={
        {
          "--daisy-primary": theme.accent,
          "--daisy-button-bg": theme.buttonBg,
          "--daisy-button-fg": theme.buttonFg,
        } as CSSProperties
      }
    >
      <StudioHeader studio={studio} />

      {(step.name === "slot" || step.name === "details") && (
        <button
          type="button"
          onClick={() => {
            setSubmitError(null);
            setStep(
              step.name === "details" ? { name: "slot", course: step.course } : { name: "course" }
            );
          }}
          className="mb-2 text-sm text-neutral-600 underline"
        >
          ← Retour
        </button>
      )}

      <h2 ref={headingRef} tabIndex={-1} className="mb-1 text-lg font-semibold outline-none">
        {TITLES[step.name]}
      </h2>

      {(step.name === "slot" || step.name === "details" || step.name === "sending") && (
        <p className="mb-3 text-sm text-neutral-600">
          {step.course.name}
          {step.name !== "slot" &&
            ` · ${formatSlotDay(step.slot.starts_at, studio.timezone)} à ${formatSlotTime(
              step.slot.starts_at,
              studio.timezone
            )}`}
        </p>
      )}

      {step.name === "course" && (
        <div className="mt-3">
          <CourseStep
            client={client}
            studio={studio}
            onSelect={(course) => {
              setSlotNotice(null);
              setStep({ name: "slot", course });
            }}
          />
        </div>
      )}

      {step.name === "slot" && (
        <SlotStep
          client={client}
          studio={studio}
          course={step.course}
          notice={slotNotice}
          onSelect={(slot) => {
            setSlotNotice(null);
            setStep({ name: "details", course: step.course, slot });
          }}
        />
      )}

      {step.name === "details" && (
        <DetailsStep
          studio={studio}
          slot={step.slot}
          draft={draft}
          submitError={submitError}
          onChange={setDraft}
          onSubmit={(final) => {
            setDraft(final);
            void send(final, step.course, step.slot);
          }}
        />
      )}

      {step.name === "sending" && <SendingState />}

      {step.name === "confirmed" && (
        <Confirmation step={step} studio={studio} onRestart={restart} />
      )}
    </div>
  );
}

function describeError(err: unknown, studio: Studio): string {
  if (err instanceof NetworkError) {
    return "Connexion perdue. Vos informations sont conservées : vérifiez votre réseau, puis réessayez.";
  }
  if (err instanceof DaisyApiError) {
    switch (err.body?.error) {
      case "rate_limited":
        return "Trop de tentatives depuis cette connexion. Merci de réessayer dans quelques minutes.";
      case "phone_required":
        return "L'atelier demande un numéro de téléphone pour confirmer la réservation.";
      case "too_many_seats":
        return `L'atelier limite les réservations à ${studio.booking_policy.max_seats_per_booking} places par personne.`;
      case "origin_not_allowed":
        return "La réservation en ligne n'est pas activée sur ce site. Contactez directement l'atelier.";
    }
  }

  return "La réservation n'a pas abouti. Vos informations sont conservées, vous pouvez réessayer.";
}

function SendingState() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-6">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
      />
      <p>{slow ? "Encore un instant, l'atelier confirme votre place…" : "Réservation en cours…"}</p>
    </div>
  );
}

function Confirmation({
  step,
  studio,
  onRestart,
}: {
  step: Extract<Step, { name: "confirmed" }>;
  studio: Studio;
  onRestart: () => void;
}) {
  const { booking, course, slot, seats, email } = step;

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-lg bg-neutral-50 p-4 text-center">
        <p className="text-sm text-neutral-600">Code de réservation</p>
        <p className="font-mono text-2xl font-semibold tracking-wider">
          {booking.confirmation_code}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">Cours</dt>
        <dd>{course.name}</dd>
        <dt className="text-neutral-500">Date</dt>
        <dd className="first-letter:uppercase">
          {formatSlotDay(slot.starts_at, studio.timezone)} à{" "}
          {formatSlotTime(slot.starts_at, studio.timezone)}
        </dd>
        <dt className="text-neutral-500">Places</dt>
        <dd>{seats}</dd>
        <dt className="text-neutral-500">Total</dt>
        <dd className="font-medium">{formatPrice(booking.total_cents, studio.currency)}</dd>
      </dl>

      <p className="text-sm">
        Un e-mail de confirmation a été envoyé à <strong>{email}</strong>.
      </p>
      <p className="text-xs text-neutral-500">
        Annulation gratuite jusqu&apos;à {studio.booking_policy.cancellation_hours} h avant le
        cours.
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded-md border border-neutral-300 px-4 py-2 text-sm"
      >
        Réserver un autre cours
      </button>
    </div>
  );
}

function StudioHeader({ studio }: { studio: Studio }) {
  const [failed, setFailed] = useState(false);
  const logo = studio.branding.logo_url;

  return (
    <div className="mb-4 flex min-h-8 items-center border-b border-neutral-100 pb-3">
      {logo && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo tiers, taille contrainte
        <img
          src={logo}
          alt={studio.name}
          onError={() => setFailed(true)}
          className="h-8 max-w-[160px] object-contain"
        />
      ) : (
        <span className="text-sm font-semibold">{studio.name}</span>
      )}
    </div>
  );
}