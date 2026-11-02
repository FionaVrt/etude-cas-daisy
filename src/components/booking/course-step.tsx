"use client";

import { useEffect, useState } from "react";
import type { DaisyClient } from "@/lib/daisy/client";
import type { Course, Studio } from "@/lib/daisy/types";
import { formatDuration, formatPrice } from "@/lib/format";

type Props = {
  client: DaisyClient;
  studio: Studio;
  onSelect: (course: Course) => void;
};

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; courses: Course[] };

const SEARCH_THRESHOLD = 8;

// Recherche insensible aux accents et à la casse : « emaillage » trouve « Émaillage »
const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function CourseStep({ client, studio, onSelect }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    client.getCourses().then(
      ({ courses }) => {
        if (!cancelled) setState({ kind: "ready", courses });
      },
      () => {
        if (!cancelled) setState({ kind: "error" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [client, attempt]);

  if (state.kind === "loading") {
    return (
      <ul className="space-y-2" aria-busy="true" aria-label="Chargement des cours">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-[90px] animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </ul>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3">
        <p>Impossible de charger les cours. Vérifiez votre connexion.</p>
        <button
          type="button"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((n) => n + 1);
          }}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (state.courses.length === 0) {
    return <p className="text-neutral-600">Aucun cours n&apos;est proposé pour le moment.</p>;
  }

  const visible = query
    ? state.courses.filter((c) => normalize(c.name).includes(normalize(query)))
    : state.courses;

  return (
    <div className="space-y-3">
      {state.courses.length > SEARCH_THRESHOLD && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un cours"
          aria-label="Rechercher un cours"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      )}

      {visible.length === 0 ? (
        <p className="text-neutral-600">Aucun cours ne correspond à « {query} ».</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((course) => (
            <li key={course.course_id}>
              <button
                type="button"
                onClick={() => onSelect(course)}
                className="flex w-full gap-3 rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:border-[var(--daisy-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--daisy-primary)]"
              >
                <CourseThumb src={course.image_url} name={course.name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{course.name}</span>
                  <span className="mt-0.5 block text-sm text-neutral-600">
                    {formatDuration(course.duration_minutes)} · dès{" "}
                    {formatPrice(course.price_cents, studio.currency)}
                  </span>
                  {course.description && (
                    <span className="mt-1 line-clamp-2 text-sm text-neutral-500">
                      {course.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CourseThumb({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-lg font-semibold text-neutral-400"
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- image tierce, taille fixe
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-16 shrink-0 rounded-md object-cover"
    />
  );
}