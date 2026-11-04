-- Données de test, reprenant les cas difficiles de daisy-api.md :
-- description longue ou vide, cours sans image, atelier de 45 cours,
-- créneaux complets ou à une place, prix variable le samedi.

-- Pour la démo en ligne, ajouter son domaine à allowed_origins, par exemple :
-- update studios set allowed_origins = array['http://localhost:5500', 'https://mon-domaine-demo.vercel.app'] where id = 'std_2201';

insert into studios (id, public_key, allowed_origins, name, primary_color,
                     requires_phone, cancellation_hours, max_seats_per_booking) values
  ('std_2201', 'std_pk_7f2a9c', array['http://localhost:5500'], 'Atelier Terre & Feu', '#C4643A', true, 48, 4),
  -- Domaine volontairement non déclaré : montre le cas du 403
  ('std_3300', 'std_pk_big', '{}', 'La Grande Fabrique', '#2F5D50', false, 24, 6);

insert into courses (id, studio_id, name, description, duration_minutes, price_cents, image_url, level, position) values
  ('crs_118', 'std_2201', 'Tour de potier — débutant',
   'Deux heures d''initiation au tournage. Tout le matériel est fourni, prévoyez des vêtements qui ne craignent rien.',
   120, 7500, 'https://picsum.photos/seed/crs118/600/400', 'debutant', 1),
  ('crs_119', 'std_2201', 'Émaillage et cuisson',
   trim(repeat('Un après-midi complet pour découvrir l''émaillage : préparation des pièces, choix des émaux, techniques de trempage et de pinceau. ', 6)),
   180, 9500, null, 'intermediaire', 2),
  ('crs_120', 'std_2201', 'Modelage parent-enfant', '', 90, 4500,
   'https://picsum.photos/seed/crs120/600/400', 'tous_niveaux', 3);

-- 45 cours pour La Grande Fabrique
insert into courses (id, studio_id, name, description, duration_minutes, price_cents, image_url, level, position)
select 'crs_9' || lpad(i::text, 2, '0'), 'std_3300', 'Atelier n°' || (i + 1),
       case when i % 3 = 0 then '' else 'Cours de découverte, matériel fourni.' end,
       60 + (i % 4) * 30, 3500 + (i % 5) * 1000,
       case when i % 2 = 0 then 'https://picsum.photos/seed/big' || i || '/600/400' end,
       'tous_niveaux', i
from generate_series(0, 44) as i;

-- Mercredis et samedis à 14 h (heure de Paris) sur 120 jours à partir d'aujourd'hui,
-- places selon le motif 8, 0, 1, 5, 2 ; +10 € le samedi
insert into slots (id, course_id, starts_at, seats_total, seats_available, price_cents)
select 'slt_' || c.id || '_' || (n - 1),
       c.id,
       (d::date + time '14:00') at time zone 'Europe/Paris',
       8,
       (array[8, 0, 1, 5, 2])[((n - 1) % 5) + 1],
       c.price_cents + case when extract(isodow from d) = 6 then 1000 else 0 end
from (
  select c.id, d, row_number() over (partition by c.id order by d) as n
  from courses c
  cross join generate_series(current_date + 1, current_date + 120, interval '1 day') as d
  where extract(isodow from d) in (3, 6)
) as x
join courses c on c.id = x.id;
