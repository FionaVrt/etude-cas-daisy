"use client";

import { useState, type ReactNode } from "react";
import type { Slot, Studio } from "@/lib/daisy/types";
import { formatPrice } from "@/lib/format";

export type CustomerDraft = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  seats: number;
  notes: string;
};

export const EMPTY_DRAFT: CustomerDraft = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  seats: 1,
  notes: "",
};

type Errors = Partial<Record<keyof CustomerDraft, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// « 06 12 34 56 78 » → « +33612345678 » (ateliers français)
export function normalizePhone(raw: string) {
  const compact = raw.replace(/[\s.\-()]/g, "");
  return /^0\d{9}$/.test(compact) ? `+33${compact.slice(1)}` : compact;
}

function validate(d: CustomerDraft, studio: Studio): Errors {
  const errors: Errors = {};
  if (!d.first_name.trim()) errors.first_name = "Indiquez votre prénom.";
  if (!d.last_name.trim()) errors.last_name = "Indiquez votre nom.";
  if (!EMAIL_RE.test(d.email.trim())) errors.email = "Cette adresse e-mail semble incomplète.";

  const phone = normalizePhone(d.phone);
  if (!phone && studio.booking_policy.requires_phone) {
    errors.phone = "L'atelier demande un numéro pour vous prévenir en cas d'imprévu.";
  } else if (phone && !/^\+?\d{8,15}$/.test(phone)) {
    errors.phone = "Ce numéro semble incomplet.";
  }
  return errors;
}

type Props = {
  studio: Studio;
  slot: Slot;
  draft: CustomerDraft;
  submitError?: string | null;
  onChange: (draft: CustomerDraft) => void;
  onSubmit: (draft: CustomerDraft) => void;
};

export function DetailsStep({ studio, slot, draft, submitError, onChange, onSubmit }: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const policy = studio.booking_policy;
  const maxSeats = Math.max(1, Math.min(policy.max_seats_per_booking, slot.seats_available));
  const seats = Math.min(draft.seats, maxSeats);

  const set = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) =>
    onChange({ ...draft, [key]: value });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(draft, studio);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }
        onSubmit({
      ...draft,
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      email: draft.email.trim(),
      notes: draft.notes.trim(),
      seats,
      phone: normalizePhone(draft.phone),
    });
  }

  const inputProps = (key: "first_name" | "last_name" | "email" | "phone") => ({
    id: `field-${key}`,
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `error-${key}` : undefined,
    className: `w-full rounded-md border px-3 py-2 text-base ${
      errors[key] ? "border-red-600" : "border-neutral-300"
    }`,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="first_name" label="Prénom" error={errors.first_name}>
          <input {...inputProps("first_name")} autoComplete="given-name" />
        </Field>
        <Field id="last_name" label="Nom" error={errors.last_name}>
          <input {...inputProps("last_name")} autoComplete="family-name" />
        </Field>
      </div>

      <Field id="email" label="E-mail" hint="Pour recevoir votre confirmation" error={errors.email}>
        <input {...inputProps("email")} type="email" autoComplete="email" inputMode="email" />
      </Field>

      <Field
        id="phone"
        label={policy.requires_phone ? "Téléphone" : "Téléphone (facultatif)"}
        error={errors.phone}
      >
        <input {...inputProps("phone")} type="tel" autoComplete="tel" inputMode="tel" />
      </Field>

      <Field id="seats" label="Nombre de places">
        {maxSeats === 1 ? (
          <p className="text-sm text-neutral-600">
            1 place{slot.seats_available === 1 ? " (la dernière disponible)" : ""}
          </p>
        ) : (
          <select
            id="field-seats"
            value={seats}
            onChange={(e) => set("seats", Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-base"
          >
            {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} place{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field id="notes" label="Un mot pour l'atelier (facultatif)" hint="Allergie, gaucher, débutant complet…">
        <textarea
          id="field-notes"
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </Field>

      {submitError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </p>
      )}

      <div className="space-y-2 border-t border-neutral-200 pt-4">
        <p className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(slot.price_cents * seats, studio.currency)}</span>
        </p>
        <p className="text-xs text-neutral-500">
          Annulation gratuite jusqu&apos;à {policy.cancellation_hours} h avant le cours.
        </p>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-3 font-medium text-white"
        >
          Réserver
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={`field-${id}`} className="block text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      {children}
      {error && (
        <p id={`error-${id}`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}