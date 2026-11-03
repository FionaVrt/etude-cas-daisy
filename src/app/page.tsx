const WIDGET_URL = "https://etude-cas-daisy-khi4.vercel.app";
const DEMO_URL = "https://etude-cas-daisy-demo.vercel.app";
const REPO_URL = "https://github.com/FionaVrt/etude-cas-daisy";

const SNIPPET = `<div id="daisy-booking" data-studio="std_pk_7f2a9c"></div>
<script src="${WIDGET_URL}/embed.js" async></script>`;

const SCENARIOS = [
  {
    href: "/embed/std_pk_7f2a9c?mock=slot_cancelled",
    label: "Créneau annulé par l'atelier pendant la saisie",
  },
  {
    href: "/embed/std_pk_7f2a9c?mock=slot_full",
    label: "Dernière place prise pendant la saisie",
  },
  { href: "/embed/std_pk_7f2a9c?mock=rate_limited", label: "Trop de tentatives (429)" },
  { href: "/embed/std_pk_big", label: "Atelier de 45 cours (recherche)" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-10 px-4 py-12 font-sans text-neutral-900">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500">Étude de cas Daisy · Sujet B</p>
        <h1 className="text-3xl font-semibold">Le widget que l&apos;artisan pose sur son site</h1>
        <p className="text-neutral-600">
          Deux lignes à coller, et un tunnel de réservation apparaît : choix du cours, du
          créneau, coordonnées, confirmation.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Voir le widget</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={DEMO_URL}
            className="rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-900"
          >
            <span className="block font-medium">Sur un site d&apos;artisan →</span>
            <span className="mt-1 block text-sm text-neutral-600">
              Autre domaine, CSS agressif, colonne de 320 px et domaine non déclaré.
            </span>
          </a>
          <Link
            href="/embed/std_pk_7f2a9c"
            className="rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-900"
          >
            <span className="block font-medium">Seul, en pleine page →</span>
            <span className="mt-1 block text-sm text-neutral-600">
              La page vers laquelle renvoie le lien de secours.
            </span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tester les cas difficiles</h2>
        <ul className="space-y-2 text-sm">
          {SCENARIOS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="underline underline-offset-2">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-600">
          Pour la vraie course à la dernière place, sans scénario forcé : ouvrez deux onglets sur
          le même créneau « Plus que 1 place », remplissez le premier, réservez avec le second,
          puis validez le premier.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Installer</h2>
        <p className="text-sm text-neutral-600">
          Ce que l&apos;artisan colle sur Wix, Squarespace, WordPress ou un site fait main :
        </p>
        <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-4 text-xs">
          <code>{SNIPPET}</code>
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Code et choix techniques</h2>
        <p className="text-sm text-neutral-600">
          Isolation par iframe, réservation atomique dans Postgres, idempotence, gestion des
          erreurs : tout est expliqué dans le{" "}
          <a href={`${REPO_URL}#readme`} className="underline underline-offset-2">
            README du dépôt
          </a>
          .
        </p>
      </section>
    </main>
  );
}
import Link from "next/link";
