-- Wallet release and withdrawal RPCs for the live Handiwave payment flow.

drop function if exists public.request_wallet_withdrawal(numeric, text, text, text);
drop function if exists public.approve_wallet_withdrawal(uuid, text, text);
drop function if exists public.reject_wallet_withdrawal(uuid, text);
drop function if exists public.release_booking_escrow_for_customer(uuid);

create table if not exists public.wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'NGN',
  bank_name text,
  account_name text,
  account_number text,
  status text not null default 'pending',
  payout_method text not null default 'manual',
  admin_note text,
  rejection_reason text,
  transaction_id uuid references public.wallet_transactions (id) on delete set null,
  transfer_status text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wallets add column if not exists escrow_balance numeric(12, 2) not null default 0;
alter table public.wallets add column if not exists total_credited numeric(12, 2) not null default 0;
alter table public.wallets add column if not exists total_debited numeric(12, 2) not null default 0;

alter table public.wallet_withdrawal_requests add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
alter table public.wallet_withdrawal_requests add column if not exists currency text not null default 'NGN';
alter table public.wallet_withdrawal_requests add column if not exists bank_name text;
alter table public.wallet_withdrawal_requests add column if not exists account_name text;
alter table public.wallet_withdrawal_requests add column if not exists account_number text;
alter table public.wallet_withdrawal_requests add column if not exists status text not null default 'pending';
alter table public.wallet_withdrawal_requests add column if not exists payout_method text not null default 'manual';
alter table public.wallet_withdrawal_requests add column if not exists admin_note text;
alter table public.wallet_withdrawal_requests add column if not exists rejection_reason text;
alter table public.wallet_withdrawal_requests add column if not exists transaction_id uuid references public.wallet_transactions (id) on delete set null;
alter table public.wallet_withdrawal_requests add column if not exists transfer_status text;
alter table public.wallet_withdrawal_requests add column if not exists requested_at timestamptz not null default now();
alter table public.wallet_withdrawal_requests add column if not exists processed_at timestamptz;
alter table public.wallet_withdrawal_requests add column if not exists created_at timestamptz not null default now();
alter table public.wallet_withdrawal_requests add column if not exists updated_at timestamptz not null default now();

create index if not exists wallet_withdrawal_requests_wallet_id_idx
on public.wallet_withdrawal_requests (wallet_id);

create index if not exists wallet_withdrawal_requests_profile_id_idx
on public.wallet_withdrawal_requests (profile_id);

alter table public.wallet_withdrawal_requests enable row level security;

drop policy if exists "Users can read own withdrawal requests" on public.wallet_withdrawal_requests;
create policy "Users can read own withdrawal requests"
on public.wallet_withdrawal_requests for select
using (profile_id = auth.uid());

drop policy if exists "Admins can read withdrawal requests" on public.wallet_withdrawal_requests;
create policy "Admins can read withdrawal requests"
on public.wallet_withdrawal_requests for select
using (public.current_user_role() = 'admin');

create or replace function public.ensure_wallet_for_profile(target_profile_id uuid)
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

  if auth.uid() is distinct from target_profile_id and public.current_user_role() is distinct from 'admin' then
    raise exception 'You can only create your own wallet';
  end if;

  insert into public.wallets (profile_id)
  values (target_profile_id)
  on conflict (profile_id) do nothing;

  select id into wallet_id
  from public.wallets
  where profile_id = target_profile_id;

  return wallet_id;
end;
$$;

grant execute on function public.ensure_wallet_for_profile(uuid) to authenticated;

create or replace function public.release_booking_escrow_for_customer(target_booking_id uuid)
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

  if booking_row.customer_id is distinct from auth.uid() then
    raise exception 'You can only confirm your own booking';
  end if;

  if booking_row.status::text is distinct from 'artisan_completed' then
    raise exception 'This booking is not awaiting customer completion confirmation';
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

  if customer_wallet_id is null or artisan_wallet_id is null then
    raise exception 'Customer or artisan wallet not found';
  end if;

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
    payment_released_at = now(),
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

grant execute on function public.release_booking_escrow_for_customer(uuid) to authenticated;

create or replace function public.request_wallet_withdrawal(
  withdrawal_amount numeric,
  bank_name text,
  account_name text,
  account_number text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.wallets%rowtype;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to request withdrawal';
  end if;

  if coalesce(withdrawal_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  if coalesce(trim(bank_name), '') = '' or coalesce(trim(account_name), '') = '' or coalesce(trim(account_number), '') = '' then
    raise exception 'Bank name, account name, and account number are required';
  end if;

  select *
  into wallet_row
  from public.wallets
  where profile_id = auth.uid()
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  if coalesce(wallet_row.balance, 0) < withdrawal_amount then
    raise exception 'Insufficient available balance';
  end if;

  update public.wallets
  set
    balance = balance - withdrawal_amount,
    total_debited = coalesce(total_debited, 0) + withdrawal_amount,
    updated_at = now()
  where id = wallet_row.id;

  insert into public.wallet_transactions (
    wallet_id,
    type,
    status,
    amount,
    reference,
    description,
    created_at
  )
  values (
    wallet_row.id,
    'withdrawal',
    'pending',
    withdrawal_amount,
    'withdrawal:' || gen_random_uuid()::text,
    'Withdrawal request pending manual payout',
    now()
  )
  returning id into request_id;

  insert into public.wallet_withdrawal_requests (
    wallet_id,
    profile_id,
    amount,
    currency,
    bank_name,
    account_name,
    account_number,
    status,
    payout_method,
    transaction_id,
    requested_at,
    created_at,
    updated_at
  )
  values (
    wallet_row.id,
    wallet_row.profile_id,
    withdrawal_amount,
    wallet_row.currency,
    trim(bank_name),
    trim(account_name),
    trim(account_number),
    'pending',
    'manual',
    request_id,
    now(),
    now(),
    now()
  )
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.request_wallet_withdrawal(numeric, text, text, text) to authenticated;

create or replace function public.approve_wallet_withdrawal(
  withdrawal_request_id uuid,
  payout_method text default 'manual',
  admin_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  withdrawal_row public.wallet_withdrawal_requests%rowtype;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Only admins can approve withdrawals';
  end if;

  select *
  into withdrawal_row
  from public.wallet_withdrawal_requests
  where id = withdrawal_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  update public.wallet_withdrawal_requests
  set
    status = 'successful',
    payout_method = coalesce(approve_wallet_withdrawal.payout_method, 'manual'),
    admin_note = approve_wallet_withdrawal.admin_note,
    transfer_status = 'manual_paid',
    processed_at = now(),
    updated_at = now()
  where id = withdrawal_row.id;

  update public.wallet_transactions
  set status = 'successful'
  where id = withdrawal_row.transaction_id;

  return withdrawal_row.id;
end;
$$;

grant execute on function public.approve_wallet_withdrawal(uuid, text, text) to authenticated;

create or replace function public.reject_wallet_withdrawal(
  withdrawal_request_id uuid,
  rejection_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  withdrawal_row public.wallet_withdrawal_requests%rowtype;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Only admins can reject withdrawals';
  end if;

  if coalesce(trim(rejection_reason), '') = '' then
    raise exception 'Rejection reason is required';
  end if;

  select *
  into withdrawal_row
  from public.wallet_withdrawal_requests
  where id = withdrawal_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if withdrawal_row.status = 'pending' then
    update public.wallets
    set
      balance = coalesce(balance, 0) + withdrawal_row.amount,
      total_debited = greatest(coalesce(total_debited, 0) - withdrawal_row.amount, 0),
      updated_at = now()
    where id = withdrawal_row.wallet_id;
  end if;

  update public.wallet_withdrawal_requests
  set
    status = 'failed',
    rejection_reason = reject_wallet_withdrawal.rejection_reason,
    processed_at = now(),
    updated_at = now()
  where id = withdrawal_row.id;

  update public.wallet_transactions
  set status = 'failed'
  where id = withdrawal_row.transaction_id;

  return withdrawal_row.id;
end;
$$;

grant execute on function public.reject_wallet_withdrawal(uuid, text) to authenticated;
