-- Fix Paystack escrow application to match the current platform_commission_entries schema.
-- This intentionally does NOT add payment_transaction_id to platform_commission_entries.
-- Run this in Supabase SQL Editor, then redeploy verify-payment/paystack-webhook if needed.

create or replace function public.ensure_wallet_for_profile_internal(target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_id uuid;
begin
  if target_profile_id is null then
    raise exception 'target_profile_id is required';
  end if;

  insert into public.wallets (profile_id)
  values (target_profile_id)
  on conflict (profile_id) do nothing;

  select id into wallet_id
  from public.wallets
  where profile_id = target_profile_id;

  if wallet_id is null then
    raise exception 'Unable to ensure wallet for profile %', target_profile_id;
  end if;

  return wallet_id;
end;
$$;

revoke all on function public.ensure_wallet_for_profile_internal(uuid) from authenticated;
revoke all on function public.ensure_wallet_for_profile_internal(uuid) from anon;

create or replace function public.apply_paystack_booking_payment_success(
  target_provider_payload jsonb,
  target_provider_reference text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.paystack_payment_transactions%rowtype;
  booking_row public.bookings%rowtype;
  artisan_profile_id uuid;
  customer_wallet_id uuid;
  artisan_wallet_id uuid;
  v_gross_amount numeric(12, 2);
  v_commission_rate numeric(5, 4);
  v_commission_amount numeric(12, 2);
  v_artisan_payout numeric(12, 2);
  existing_commission_id uuid;
  paystack_data jsonb;
  paystack_status text;
  v_provider_transaction_id text;
begin
  if coalesce(target_provider_reference, '') = '' then
    raise exception 'target_provider_reference is required';
  end if;

  paystack_data := coalesce(target_provider_payload->'data', '{}'::jsonb);
  paystack_status := paystack_data->>'status';
  v_provider_transaction_id := nullif(paystack_data->>'id', '');

  if paystack_status is distinct from 'success' then
    raise exception 'Paystack payment is not successful. Status: %', coalesce(paystack_status, 'unknown');
  end if;

  select *
  into payment_row
  from public.paystack_payment_transactions
  where provider_reference = target_provider_reference
  for update;

  if not found then
    raise exception 'Paystack payment transaction not found for reference %', target_provider_reference;
  end if;

  select *
  into booking_row
  from public.bookings
  where id = payment_row.booking_id
  for update;

  if not found then
    raise exception 'Booking not found for Paystack reference %', target_provider_reference;
  end if;

  if booking_row.payment_status in ('held_in_escrow', 'released') then
    return booking_row.id;
  end if;

  select profile_id
  into artisan_profile_id
  from public.artisans
  where id = booking_row.artisan_id;

  if artisan_profile_id is null then
    raise exception 'Artisan profile not found for booking %', booking_row.id;
  end if;

  v_gross_amount := coalesce(
    booking_row.final_price,
    booking_row.quoted_price,
    payment_row.amount,
    booking_row.escrow_amount,
    0
  );

  if v_gross_amount <= 0 then
    raise exception 'Booking % does not have a payable gross amount', booking_row.id;
  end if;

  v_commission_rate := coalesce(booking_row.commission_rate, 0.1000);
  v_commission_amount := round(v_gross_amount * v_commission_rate, 2);
  v_artisan_payout := v_gross_amount - v_commission_amount;

  customer_wallet_id := public.ensure_wallet_for_profile_internal(booking_row.customer_id);
  artisan_wallet_id := public.ensure_wallet_for_profile_internal(artisan_profile_id);

  update public.paystack_payment_transactions
  set
    status = 'success',
    provider_payload = target_provider_payload,
    provider_transaction_id = coalesce(v_provider_transaction_id, provider_transaction_id),
    channel = coalesce(paystack_data->>'channel', channel),
    fees = coalesce(nullif(paystack_data->>'fees', '')::numeric / 100, fees)
  where id = payment_row.id;

  update public.bookings
  set
    payment_status = 'held_in_escrow',
    payment_reference = target_provider_reference,
    paystack_payment_transaction_id = payment_row.id,
    final_price = coalesce(final_price, v_gross_amount),
    escrow_amount = v_gross_amount,
    commission_rate = v_commission_rate,
    commission_amount = v_commission_amount,
    artisan_payout_amount = v_artisan_payout,
    updated_at = now()
  where id = booking_row.id;

  select id
  into existing_commission_id
  from public.platform_commission_entries
  where booking_id = booking_row.id
  for update;

  if existing_commission_id is null then
    insert into public.platform_commission_entries (
      booking_id,
      customer_id,
      artisan_id,
      gross_amount,
      commission_rate,
      commission_amount,
      artisan_payout_amount,
      status,
      created_at,
      updated_at
    )
    values (
      booking_row.id,
      booking_row.customer_id,
      booking_row.artisan_id,
      v_gross_amount,
      v_commission_rate,
      v_commission_amount,
      v_artisan_payout,
      'pending',
      now(),
      now()
    );
  else
    update public.platform_commission_entries
    set
      customer_id = booking_row.customer_id,
      artisan_id = booking_row.artisan_id,
      gross_amount = v_gross_amount,
      commission_rate = v_commission_rate,
      commission_amount = v_commission_amount,
      artisan_payout_amount = v_artisan_payout,
      status = case
        when status::text in ('refunded', 'released') then status
        else 'pending'
      end,
      updated_at = now()
    where id = existing_commission_id;
  end if;

  update public.wallets
  set
    escrow_balance = coalesce(escrow_balance, 0) + v_gross_amount,
    total_debited = coalesce(total_debited, 0) + v_gross_amount,
    updated_at = now()
  where id = customer_wallet_id;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallets'
      and column_name = 'pending_earnings'
  ) then
    execute
      'update public.wallets
       set
         escrow_balance = coalesce(escrow_balance, 0) + $1,
         pending_earnings = coalesce(pending_earnings, 0) + $1,
         updated_at = now()
       where id = $2'
    using v_artisan_payout, artisan_wallet_id;
  else
    update public.wallets
    set
      escrow_balance = coalesce(escrow_balance, 0) + v_artisan_payout,
      updated_at = now()
    where id = artisan_wallet_id;
  end if;

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
  values
    (
      customer_wallet_id,
      booking_row.id,
      'escrow_hold',
      'successful',
      v_gross_amount,
      target_provider_reference || ':customer-escrow-hold',
      'Paystack payment held in escrow for booking',
      now()
    ),
    (
      artisan_wallet_id,
      booking_row.id,
      'escrow_hold',
      'successful',
      v_artisan_payout,
      target_provider_reference || ':artisan-pending-earning',
      'Pending artisan payout held in escrow',
      now()
    )
  on conflict (reference) do nothing;

  if to_regclass('public.platform_wallet') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'platform_wallet'
        and column_name = 'balance'
    ) then
      execute
        'update public.platform_wallet
         set balance = coalesce(balance, 0) + $1'
      using v_commission_amount;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'platform_wallet'
        and column_name = 'updated_at'
    ) then
      execute 'update public.platform_wallet set updated_at = now()';
    end if;
  elsif to_regclass('public.platform_wallets') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'platform_wallets'
        and column_name = 'balance'
    ) then
      execute
        'update public.platform_wallets
         set balance = coalesce(balance, 0) + $1'
      using v_commission_amount;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'platform_wallets'
        and column_name = 'updated_at'
    ) then
      execute 'update public.platform_wallets set updated_at = now()';
    end if;
  end if;

  return booking_row.id;
end;
$$;

grant execute on function public.apply_paystack_booking_payment_success(jsonb, text) to service_role;

create or replace function public.mark_paystack_booking_payment_failed(
  target_provider_payload jsonb,
  target_provider_reference text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.paystack_payment_transactions%rowtype;
begin
  if coalesce(target_provider_reference, '') = '' then
    raise exception 'target_provider_reference is required';
  end if;

  select *
  into payment_row
  from public.paystack_payment_transactions
  where provider_reference = target_provider_reference
  for update;

  if not found then
    raise exception 'Paystack payment transaction not found for reference %', target_provider_reference;
  end if;

  update public.paystack_payment_transactions
  set
    status = 'failed',
    provider_payload = target_provider_payload
  where id = payment_row.id;

  update public.bookings
  set
    payment_status = 'failed',
    updated_at = now()
  where id = payment_row.booking_id
    and payment_status not in ('held_in_escrow', 'released', 'refunded');

  return payment_row.booking_id;
end;
$$;

grant execute on function public.mark_paystack_booking_payment_failed(jsonb, text) to service_role;
