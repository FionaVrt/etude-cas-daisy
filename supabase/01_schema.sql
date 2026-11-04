-- ============ Tables ============

create table studios (
  id text primary key,
  public_key text unique not null,
  allowed_origins text[] not null default '{}',
  name text not null,
  timezone text not null default 'Europe/Paris',
  currency text not null default 'EUR',
  primary_color text not null,
  logo_url text,
  requires_phone boolean not null default false,
  cancellation_hours int not null default 48,
  max_seats_per_booking int not null default 4
);

create table courses (
  id text primary key,
  studio_id text not null references studios(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes int not null,
  price_cents int not null,
  image_url text,
  level text not null,
  position int not null default 0
);

create table slots (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  starts_at timestamptz not null,
  seats_total int not null,
  -- Filet de sécurité : la base refuse toute survente, quoi qu'il arrive côté code
  seats_available int not null check (seats_available >= 0 and seats_available <= seats_total),
  price_cents int not null,
  cancelled boolean not null default false
);
create index slots_course_starts_idx on slots (course_id, starts_at);

create table bookings (
  id text primary key default 'bkg_' || replace(gen_random_uuid()::text, '-', ''),
  slot_id text not null references slots(id),
  seats int not null check (seats > 0),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  notes text,
  confirmation_code text not null,
  total_cents int not null,
  -- Unique : deux envois avec la même clé ne peuvent pas créer deux réservations
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- RLS activé sans aucune policy : tables inaccessibles depuis le navigateur.
-- Seules les routes Next.js (côté serveur, clé secrète) y accèdent.
alter table studios enable row level security;
alter table courses enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;
