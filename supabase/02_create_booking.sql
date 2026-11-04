-- Réservation complète en une seule transaction :
-- idempotence, contrôles, décrément atomique, enregistrement.

create or replace function create_booking(
  p_public_key text,
  p_slot_id text,
  p_seats int,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_idempotency_key text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_studio studios;
  v_slot slots;
  v_booking bookings;
  v_code text;
begin
  -- 1. Idempotence : cette demande a déjà abouti → même réponse
  if p_idempotency_key is not null then
    select * into v_booking from bookings where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object(
        'booking_id', v_booking.id, 'status', 'confirmed',
        'confirmation_code', v_booking.confirmation_code, 'total_cents', v_booking.total_cents);
    end if;
  end if;

  -- 2. Contrôles
  select * into v_studio from studios where public_key = p_public_key;
  if not found then return jsonb_build_object('error', 'invalid_key'); end if;

  select s.* into v_slot
  from slots s join courses c on c.id = s.course_id
  where s.id = p_slot_id and c.studio_id = v_studio.id;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  if v_slot.cancelled then return jsonb_build_object('error', 'slot_cancelled'); end if;
  if p_seats > v_studio.max_seats_per_booking then
    return jsonb_build_object('error', 'too_many_seats');
  end if;
  if v_studio.requires_phone and coalesce(trim(p_phone), '') = '' then
    return jsonb_build_object('error', 'phone_required');
  end if;

  -- 3. Décrément atomique : ne réussit que s'il reste assez de places.
  --    Deux demandes simultanées se sérialisent sur la ligne ; la seconde
  --    réévalue la condition et ne met rien à jour.
  update slots
     set seats_available = seats_available - p_seats
   where id = p_slot_id and seats_available >= p_seats and not cancelled
  returning * into v_slot;

  if not found then
    return jsonb_build_object(
      'error', 'slot_full',
      'available', (select seats_available from slots where id = p_slot_id));
  end if;

  -- 4. Enregistrement
  select 'DY-' || string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    into v_code
    from generate_series(1, 4);

  insert into bookings (slot_id, seats, first_name, last_name, email, phone, notes,
                        confirmation_code, total_cents, idempotency_key)
  values (p_slot_id, p_seats, p_first_name, p_last_name, p_email, nullif(trim(p_phone), ''),
          nullif(trim(p_notes), ''), v_code, v_slot.price_cents * p_seats, p_idempotency_key)
  returning * into v_booking;

  return jsonb_build_object(
    'booking_id', v_booking.id, 'status', 'confirmed',
    'confirmation_code', v_booking.confirmation_code, 'total_cents', v_booking.total_cents);

exception when unique_violation then
  -- Deux envois simultanés avec la même clé : le décrément du perdant est annulé,
  -- on renvoie la réservation du gagnant
  select * into v_booking from bookings where idempotency_key = p_idempotency_key;
  return jsonb_build_object(
    'booking_id', v_booking.id, 'status', 'confirmed',
    'confirmation_code', v_booking.confirmation_code, 'total_cents', v_booking.total_cents);
end;
$$;

-- Personne d'autre que le serveur ne peut appeler la fonction
revoke execute on function create_booking from public, anon, authenticated;
