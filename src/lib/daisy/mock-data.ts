import type { Course, Slot, Studio } from "./types";

type MockStudio = Studio & { public_key: string; allowed_origins: string[]; courses: Course[] };

const LONG_DESC =
  "Un après-midi complet pour découvrir l'émaillage : préparation des pièces, choix des émaux, techniques de trempage et de pinceau. ".repeat(6).trim();

const terreEtFeu: MockStudio = {
  public_key: "std_pk_7f2a9c",
  allowed_origins: ["http://localhost:5500"],
  studio_id: "std_2201",
  name: "Atelier Terre & Feu",
  timezone: "Europe/Paris",
  currency: "EUR",
  branding: { primary_color: "#C4643A", logo_url: null },
  booking_policy: { requires_phone: true, cancellation_hours: 48, max_seats_per_booking: 4 },
  courses: [
    {
      course_id: "crs_118",
      name: "Tour de potier — débutant",
      description:
        "Deux heures d'initiation au tournage. Tout le matériel est fourni, prévoyez des vêtements qui ne craignent rien.",
      duration_minutes: 120,
      price_cents: 7500,
      image_url: "https://picsum.photos/seed/crs118/600/400",
      level: "debutant",
    },
    {
      course_id: "crs_119",
      name: "Émaillage et cuisson",
      description: LONG_DESC,
      duration_minutes: 180,
      price_cents: 9500,
      image_url: null,
      level: "intermediaire",
    },
    {
      course_id: "crs_120",
      name: "Modelage parent-enfant",
      description: "",
      duration_minutes: 90,
      price_cents: 4500,
      image_url: "https://picsum.photos/seed/crs120/600/400",
      level: "tous_niveaux",
    },
  ],
};

const grandAtelier: MockStudio = {
  ...terreEtFeu,
  public_key: "std_pk_big",
  allowed_origins: ["http://localhost:5500"],
  studio_id: "std_3300",
  name: "La Grande Fabrique",
  branding: { primary_color: "#2F5D50", logo_url: null },
  booking_policy: { requires_phone: false, cancellation_hours: 24, max_seats_per_booking: 6 },
  courses: Array.from({ length: 45 }, (_, i) => ({
    course_id: `crs_9${String(i).padStart(2, "0")}`,
    name: `Atelier n°${i + 1}`,
    description: i % 3 === 0 ? "" : "Cours de découverte, matériel fourni.",
    duration_minutes: 60 + (i % 4) * 30,
    price_cents: 3500 + (i % 5) * 1000,
    image_url: i % 2 === 0 ? `https://picsum.photos/seed/big${i}/600/400` : null,
    level: "tous_niveaux",
  })),
};

export const studios: MockStudio[] = [terreEtFeu, grandAtelier];

// Créneaux générés à partir d'aujourd'hui pour toujours rester dans le futur.
// Stockés en mémoire pour que les réservations décrémentent les places.
const slotStore = new Map<string, Slot[]>();
const SEATS_PATTERN = [8, 0, 1, 5, 2]; // dispo, complet, dernière place…

export function getSlotsForCourse(course: Course): Slot[] {
  const existing = slotStore.get(course.course_id);
  if (existing) return existing;

  const slots: Slot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 1; day <= 120; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);
    const weekday = date.getDay();
    if (weekday !== 3 && weekday !== 6) continue; // mercredi et samedi

    date.setHours(14, 0, 0, 0);
    const index = slots.length;
    const isWeekend = weekday === 6;

    slots.push({
      slot_id: `slt_${course.course_id}_${index}`,
      starts_at: date.toISOString(),
      seats_total: 8,
      seats_available: SEATS_PATTERN[index % SEATS_PATTERN.length],
      price_cents: course.price_cents + (isWeekend ? 1000 : 0),
    });
  }

  slotStore.set(course.course_id, slots);
  return slots;
}

export function findSlot(courses: Course[], slotId: string): Slot | null {
  for (const course of courses) {
    const slot = getSlotsForCourse(course).find((s) => s.slot_id === slotId);
    if (slot) return slot;
  }
  return null;
}