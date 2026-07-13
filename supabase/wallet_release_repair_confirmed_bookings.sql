-- Repair and harden escrow release for bookings that were customer-confirmed
-- before wallet release was wired into the app.

create or replace function public.release_booking_escrow_internal(target_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  artisan_profile_id uuid;
  customer_wallet_id uuid;
  artisan_wallet_id uuid;
  v_gross_amount numeric(12, 2);
  v_artisan_payout numeric(12, 2);
  v_reference text;
begin
  if target_booking_id is null then
    raise exception 'target_booking_id is required';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = target_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  if booking_row.status::text not in ('artisan_completed', 'customer_confirmed', 'completed') then
    raise exception 'This booking is not ready for escrow release';
  end if;

  if booking_row.payment_status::text = 'released' then
    update public.bookings
    set status = 'customer_confirmed', updated_at = now()
    where id = booking_row.id;

    return booking_row.id;
  end if;

  if booking_row.payment_status::text is distinct from 'held_in_escrow' then
    raise exception 'This booking payment is not held in escrow';
  end if;

  select profile_id
  into artisan_profile_id
  from public.artisans
  where id = booking_row.artisan_id;

  if artisan_profile_id is null then
    raise exception 'Artisan profile not found';
  end if;

  insert into public.wallets (profile_id)
  values (booking_row.customer_id)
  on conflict (profile_id) do nothing;

  insert into public.wallets (profile_id)
  values (artisan_profile_id)
  on conflict (profile_id) do nothing;

  select id
  into customer_wallet_id
  from public.wallets
  where profile_id = booking_row.customer_id
  for update;

  select id
  into artisan_wallet_id
  from public.wallets
  where profile_id = artisan_profile_id
  for update;

  v_gross_amount := coalesce(booking_row.escrow_amount, booking_row.final_price, booking_row.quoted_price, 0);
  v_artisan_payout := coalesce(booking_row.artisan_payout_amount, v_gross_amount - coalesce(booking_row.commission_amount, 0), v_gross_amount);
  v_reference := coalesce(booking_row.payment_reference, booking_row.id::text) || ':escrow-release';

  if v_gross_amount <= 0 or v_artisan_payout <= 0 then
    raise exception 'Booking does not have a releasable escrow amount';
  end if;

  update public.wallets
  set
    escrow_balance = greatest(coalesce(escrow_balance, 0) - v_gross_amount, 0),
    updated_at = now()
  where id = customer_wallet_id;

  update public.wallets
  set
    balance = coalesce(balance, 0) + v_artisan_payout,
    escrow_balance = greatest(coalesce(escrow_balance, 0) - v_artisan_payout, 0),
    total_credited = coalesce(total_credited, 0) + v_artisan_payout,
    updated_at = now()
  where id = artisan_wallet_id;

  insert into public.wallet_transactions (
    wallet_id,
    booking_id,
    type,
    status,
    amount,
    reference,
    description,
    created_at
  )
  values (
    artisan_wallet_id,
    booking_row.id,
    'escrow_release',
    'successful',
    v_artisan_payout,
    v_reference,
    'Escrow released after customer confirmation',
    now()
  )
  on conflict (reference) do nothing;

  update public.bookings
  set
    status = 'customer_confirmed',
    payment_status = 'released',
    payment_released_at = coalesce(payment_released_at, now()),
    updated_at = now()
  where id = booking_row.id;

  update public.platform_commission_entries
  set
    status = 'earned',
    updated_at = now()
  where booking_id = booking_row.id
    and status::text not in ('refunded');

  return booking_row.id;
end;
$$;

revoke all on function public.release_booking_escrow_internal(uuid) from anon;
revoke all on function public.release_booking_escrow_internal(uuid) from authenticated;
grant execute on function public.release_booking_escrow_internal(uuid) to service_role;

create or replace function public.release_booking_escrow_for_customer(target_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
begin
  if target_booking_id is null then
    raise exception 'target_booking_id is required';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = target_booking_id;

  if not found then
    raise exception 'Booking not found';
  end if;

  if booking_row.customer_id is distinct from auth.uid() then
    raise exception 'You can only confirm your own booking';
  end if;

  if booking_row.status::text not in ('artisan_completed', 'customer_confirmed', 'completed') then
    raise exception 'This booking is not awaiting customer completion confirmation';
  end if;

  return public.release_booking_escrow_internal(target_booking_id);
end;
$$;

grant execute on function public.release_booking_escrow_for_customer(uuid) to authenticated;

select public.release_booking_escrow_internal(id)
from public.bookings
where payment_status::text = 'held_in_escrow'
  and status::text in ('customer_confirmed', 'completed');
