"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAutoResize } from "@/lib/embed/use-auto-resize";
import { createDaisyClient, DaisyApiError } from "@/lib/daisy/client";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { Studio } from "@/lib/daisy/types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; studio: Studio }
  | { kind: "origin_not_allowed" }
  | { kind: "error" };

export function Widget() {
  const { studioKey } = useParams<{ studioKey: string }>();
  const host = useSearchParams().get("host");
  const rootRef = useRef<HTMLDivElement>(null);
  const client = useMemo(() => createDaisyClient(studioKey, host), [studioKey, host]);
  const [state, setState] = useState<State>({ kind: "loading" });

  useAutoResize(rootRef, host);

  useEffect(() => {
    let cancelled = false;
    client.getStudio().then(
      (studio) => {
        if (!cancelled) setState({ kind: "ready", studio });
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof DaisyApiError && err.body?.error === "origin_not_allowed") {
          console.warn(`[Daisy] Le domaine ${host} n'est pas déclaré pour cet atelier.`);
          setState({ kind: "origin_not_allowed" });
        } else {
          setState({ kind: "error" });
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [client, host]);

  return (
        <div ref={rootRef} className="bg-white p-4 font-sans text-neutral-900">
      {state.kind === "loading" && <p className="text-neutral-500">Chargement…</p>}

            {state.kind === "ready" && <BookingFlow client={client} studio={state.studio} />}

      {state.kind === "origin_not_allowed" && (
        <div className="space-y-3">
          <p>La réservation en ligne n&apos;est pas encore activée sur ce site.</p>
          <a
            href={`/embed/${encodeURIComponent(studioKey)}`}
            target="_blank"
            rel="noopener"
            className="inline-block rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            Réserver sur la page de l&apos;atelier
          </a>
          <p className="border-t border-neutral-200 pt-3 text-xs text-neutral-500">
            Vous êtes l&apos;atelier ? Ajoutez <strong>{host}</strong> à vos domaines autorisés dans
            votre espace Daisy, rubrique Widget.
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <p>Impossible de charger les réservations. Réessayez dans quelques instants.</p>
      )}
    </div>
  );
}