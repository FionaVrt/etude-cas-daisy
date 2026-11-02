"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { DaisyClient } from "@/lib/daisy/client";
import type { Course, Slot, Studio } from "@/lib/daisy/types";
import { formatSlotDay, formatSlotTime } from "@/lib/format";
import { CourseStep } from "./course-step";
import { SlotStep } from "./slot-step";

type Step =
  | { name: "course" }
  | { name: "slot"; course: Course }
  | { name: "details"; course: Course; slot: Slot };

const TITLES: Record<Step["name"], string> = {
  course: "Choisissez un cours",
  slot: "Choisissez un créneau",
  details: "Vos coordonnées",
};

export function BookingFlow({ client, studio }: { client: DaisyClient; studio: Studio }) {
  const [step, setStep] = useState<Step>({ name: "course" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    window.parent.postMessage({ type: "daisy:step" }, "*");
  }, [step]);

  return (
    <div style={{ "--daisy-primary": studio.branding.primary_color } as CSSProperties}>
      {step.name !== "course" && (
        <button
          type="button"
          onClick={() =>
            setStep(step.name === "details" ? { name: "slot", course: step.course } : { name: "course" })
          }
          className="mb-2 text-sm text-neutral-600 underline"
        >
          ← Retour
        </button>
      )}

      <h2 ref={headingRef} tabIndex={-1} className="mb-1 text-lg font-semibold outline-none">
        {TITLES[step.name]}
      </h2>

      {step.name !== "course" && (
        <p className="mb-3 text-sm text-neutral-600">
          {step.course.name}
          {step.name === "details" &&
            ` · ${formatSlotDay(step.slot.starts_at, studio.timezone)} à ${formatSlotTime(step.slot.starts_at, studio.timezone)}`}
        </p>
      )}

      {step.name === "course" && (
        <div className="mt-3">
          <CourseStep
            client={client}
            studio={studio}
            onSelect={(course) => setStep({ name: "slot", course })}
          />
        </div>
      )}

      {step.name === "slot" && (
        <SlotStep
          client={client}
          studio={studio}
          course={step.course}
          onSelect={(slot) => setStep({ name: "details", course: step.course, slot })}
        />
      )}

      {step.name === "details" && (
        <p className="text-sm text-neutral-500">Le formulaire arrive à l&apos;étape 8.</p>
      )}
    </div>
  );
}