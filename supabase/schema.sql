-- Handiwave initial Supabase schema
-- Safe for first-time setup. It is mostly safe to rerun if the existing schema
-- matches these definitions. If an enum/table already exists with different
-- values or columns, PostgreSQL can still raise a conflict and you should
-- migrate manually instead of rerunning this full bootstrap file.

create extension if not exists "pgcrypto";

do $$
begin
  if to_regtype('public.user_role') is null then
    create type public.user_role as enum ('customer', 'artisan', 'admin');
  end if;

  if to_regtype('public.booking_status') is null then
    create type public.booking_status as enum (
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'disputed'
    );
  end if;

  if to_regtype('public.verification_status') is null then
    create type public.verification_status as enum (
      'pending',
      'verified',
      'rejected',
      'suspended'
    );
  end if;

  if to_regtype('public.payment_status') is null then
    create type public.payment_status as enum (
      'unpaid',
      'held_in_escrow',
      'released',
      'refunded',
      'failed'
    );
  end if;

  if to_regtype('public.reel_status') is null then
    create type public.reel_status as enum ('draft', 'published', 'archived');
  end if;

  if to_regtype('public.wallet_transaction_type') is null then
    create type public.wallet_transaction_type as enum (
      'top_up',
      'withdrawal',
      'escrow_hold',
      'escrow_release',
      'refund'
    );
  end if;

  if to_regtype('public.wallet_transaction_status') is null then
    create type public.wallet_transaction_status as enum (
      'pending',
      'successful',
      'failed'
    );
  end if;

  if to_regtype('public.notification_type') is null then
    create type public.notification_type as enum (
      'booking',
      'message',
      'wallet',
      'review',
      'system'
    );
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique,
  phone text,
  role public.user_role not null default 'customer',
  avatar_url text,
  city text,
  state text,
  country text not null default 'Nigeria',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  category text not null,
  description text,
  icon text,
  base_price numeric(12, 2),
  is_popular boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artisans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  primary_service_id uuid references public.services (id) on delete set null,
  business_name text,
  bio text,
  years_experience integer not null default 0 check (years_experience >= 0),
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  average_rating numeric(3, 2) not null default 0 check (average_rating >= 0 and average_rating <= 5),
  completed_jobs integer not null default 0 check (completed_jobs >= 0),
  starting_price numeric(12, 2),
  city text not null,
  state text not null,
  country text not null default 'Nigeria',
  service_area text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artisan_services (
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  price_from numeric(12, 2),
  primary key (artisan_id, service_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  artisan_id uuid not null references public.artisans (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  scheduled_date date,
  scheduled_time time,
  location_address text not null,
  city text not null,
  state text not null,
  country text not null default 'Nigeria',
  notes text,
  estimated_price numeric(12, 2),
  final_price numeric(12, 2),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  is_verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  video_url text,
  thumbnail_url text,
  caption text,
  status public.reel_status not null default 'draft',
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Future-ready messaging
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Future-ready wallet
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  type public.wallet_transaction_type not null,
  status public.wallet_transaction_status not null default 'pending',
  amount numeric(12, 2) not null check (amount > 0),
  reference text unique,
  description text,
  created_at timestamptz not null default now()
);

-- Future-ready notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_location_idx on public.profiles (state, city);
create index if not exists artisans_profile_id_idx on public.artisans (profile_id);
create index if not exists artisans_service_location_idx on public.artisans (primary_service_id, state, city);
create index if not exists artisans_rating_idx on public.artisans (average_rating desc);
create index if not exists artisan_services_service_id_idx on public.artisan_services (service_id);
create index if not exists bookings_customer_id_idx on public.bookings (customer_id);
create index if not exists bookings_artisan_id_idx on public.bookings (artisan_id);
create index if not exists bookings_service_id_idx on public.bookings (service_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists reviews_artisan_id_idx on public.reviews (artisan_id);
create index if not exists reviews_booking_customer_artisan_idx on public.reviews (booking_id, customer_id, artisan_id);
create index if not exists reels_artisan_id_idx on public.reels (artisan_id);
create index if not exists reels_status_idx on public.reels (status);
create index if not exists conversations_customer_id_idx on public.conversations (customer_id);
create index if not exists conversations_artisan_id_idx on public.conversations (artisan_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists wallet_transactions_wallet_id_idx on public.wallet_transactions (wallet_id);
create index if not exists notifications_profile_id_idx on public.notifications (profile_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists artisans_set_updated_at on public.artisans;
create trigger artisans_set_updated_at
before update on public.artisans
for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists reels_set_updated_at on public.reels;
create trigger reels_set_updated_at
before update on public.reels
for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

create or replace function public.validate_booking_participants()
returns trigger
language plpgsql
as $$
declare
  artisan_profile_id uuid;
begin
  select profile_id into artisan_profile_id
  from public.artisans
  where id = new.artisan_id;

  if new.customer_id = artisan_profile_id then
    raise exception 'A customer cannot book their own artisan profile.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_validate_participants on public.bookings;
create trigger bookings_validate_participants
before insert or update on public.bookings
for each row execute function public.validate_booking_participants();

create or replace function public.validate_notification_read_update()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
    or new.profile_id <> old.profile_id
    or new.type <> old.type
    or new.title <> old.title
    or coalesce(new.body, '') <> coalesce(old.body, '')
    or new.data <> old.data
    or new.created_at <> old.created_at then
    raise exception 'Only notification read_at can be updated by users.';
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_validate_read_update on public.notifications;
create trigger notifications_validate_read_update
before update on public.notifications
for each row execute function public.validate_notification_read_update();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role public.user_role;
begin
  -- Users may only self-select customer or artisan during signup.
  -- Admin profiles must be promoted manually by a trusted admin/service role.
  signup_role :=
    case
      when new.raw_user_meta_data->>'role' = 'artisan'
        then 'artisan'::public.user_role
      else 'customer'::public.user_role
    end;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Handiwave user'),
    new.email,
    signup_role
  )
  on conflict (id) do nothing;

  insert into public.wallets (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.artisans enable row level security;
alter table public.artisan_services enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.reels enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Public services are readable" on public.services;
create policy "Public services are readable"
on public.services for select
using (is_active = true);

drop policy if exists "Public verified artisans are readable" on public.artisans;
create policy "Public verified artisans are readable"
on public.artisans for select
using (verification_status = 'verified' and is_available = true);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert own non-admin profile" on public.profiles;
create policy "Users can insert own non-admin profile"
on public.profiles for insert
with check (
  auth.uid() = id
  and role in ('customer', 'artisan')
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public artisan profiles are readable" on public.profiles;
create policy "Public artisan profiles are readable"
on public.profiles for select
using (
  exists (
    select 1
    from public.artisans
    where public.artisans.profile_id = profiles.id
    and public.artisans.verification_status = 'verified'
  )
);

drop policy if exists "Artisans can insert own artisan profile" on public.artisans;
create policy "Artisans can insert own artisan profile"
on public.artisans for insert
with check (
  profile_id = auth.uid()
  and public.current_user_role() = 'artisan'
);

drop policy if exists "Artisans can read own artisan profile" on public.artisans;
create policy "Artisans can read own artisan profile"
on public.artisans for select
using (profile_id = auth.uid());

drop policy if exists "Artisans can update own artisan profile" on public.artisans;
create policy "Artisans can update own artisan profile"
on public.artisans for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "Public artisan services are readable" on public.artisan_services;
create policy "Public artisan services are readable"
on public.artisan_services for select
using (true);

drop policy if exists "Artisans can manage own artisan services" on public.artisan_services;
create policy "Artisans can manage own artisan services"
on public.artisan_services for all
using (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = artisan_services.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = artisan_services.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
);

drop policy if exists "Customers can read own bookings" on public.bookings;
create policy "Customers can read own bookings"
on public.bookings for select
using (auth.uid() = customer_id);

drop policy if exists "Artisans can read assigned bookings" on public.bookings;
create policy "Artisans can read assigned bookings"
on public.bookings for select
using (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = bookings.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
);

drop policy if exists "Customers can create bookings" on public.bookings;
create policy "Customers can create bookings"
on public.bookings for insert
with check (
  auth.uid() = customer_id
  and public.current_user_role() = 'customer'
);

drop policy if exists "Public verified reviews are readable" on public.reviews;
create policy "Public verified reviews are readable"
on public.reviews for select
using (is_verified = true);

drop policy if exists "Customers can create reviews for completed own bookings" on public.reviews;
drop policy if exists "Customers can create reviews for own bookings" on public.reviews;
create policy "Customers can create reviews for completed own bookings"
on public.reviews for insert
with check (
  auth.uid() = customer_id
  and exists (
    select 1
    from public.bookings
    where public.bookings.id = reviews.booking_id
    and public.bookings.customer_id = reviews.customer_id
    and public.bookings.artisan_id = reviews.artisan_id
    and public.bookings.customer_id = auth.uid()
    and public.bookings.status = 'completed'
  )
);

drop policy if exists "Public published reels are readable" on public.reels;
create policy "Public published reels are readable"
on public.reels for select
using (status = 'published');

drop policy if exists "Artisans can manage own reels" on public.reels;
create policy "Artisans can manage own reels"
on public.reels for all
using (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = reels.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = reels.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
);

drop policy if exists "Conversation participants can read conversations" on public.conversations;
create policy "Conversation participants can read conversations"
on public.conversations for select
using (
  auth.uid() = customer_id
  or exists (
    select 1
    from public.artisans
    where public.artisans.id = conversations.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
);

drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants can read messages"
on public.messages for select
using (
  exists (
    select 1
    from public.conversations
    where public.conversations.id = messages.conversation_id
    and (
      public.conversations.customer_id = auth.uid()
      or exists (
        select 1
        from public.artisans
        where public.artisans.id = public.conversations.artisan_id
        and public.artisans.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Conversation participants can send messages" on public.messages;
create policy "Conversation participants can send messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.conversations
    where public.conversations.id = messages.conversation_id
    and (
      public.conversations.customer_id = auth.uid()
      or exists (
        select 1
        from public.artisans
        where public.artisans.id = public.conversations.artisan_id
        and public.artisans.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Users can read own wallet" on public.wallets;
create policy "Users can read own wallet"
on public.wallets for select
using (auth.uid() = profile_id);

drop policy if exists "Users can read own wallet transactions" on public.wallet_transactions;
create policy "Users can read own wallet transactions"
on public.wallet_transactions for select
using (
  exists (
    select 1
    from public.wallets
    where public.wallets.id = wallet_transactions.wallet_id
    and public.wallets.profile_id = auth.uid()
  )
);

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
using (auth.uid() = profile_id);

drop policy if exists "Users can update own notification read status" on public.notifications;
create policy "Users can update own notification read status"
on public.notifications for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
on public.services for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage artisans" on public.artisans;
create policy "Admins can manage artisans"
on public.artisans for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage bookings" on public.bookings;
create policy "Admins can manage bookings"
on public.bookings for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage reviews" on public.reviews;
create policy "Admins can manage reviews"
on public.reviews for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage reels" on public.reels;
create policy "Admins can manage reels"
on public.reels for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
