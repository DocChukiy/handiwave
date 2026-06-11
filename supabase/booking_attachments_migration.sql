-- Handiwave booking issue attachments migration
-- Run once in Supabase SQL Editor before using customer booking image uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'handiwave-booking-attachments',
  'handiwave-booking-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.booking_attachments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  file_url text,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists booking_attachments_booking_id_idx
on public.booking_attachments (booking_id);

create index if not exists booking_attachments_uploaded_by_idx
on public.booking_attachments (uploaded_by);

alter table public.booking_attachments enable row level security;

drop policy if exists "Customers can insert own booking attachments" on public.booking_attachments;
create policy "Customers can insert own booking attachments"
on public.booking_attachments for insert
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.bookings
    where public.bookings.id = booking_attachments.booking_id
    and public.bookings.customer_id = auth.uid()
  )
);

drop policy if exists "Booking participants can read attachments" on public.booking_attachments;
create policy "Booking participants can read attachments"
on public.booking_attachments for select
using (
  exists (
    select 1
    from public.bookings
    left join public.artisans on public.artisans.id = public.bookings.artisan_id
    where public.bookings.id = booking_attachments.booking_id
    and (
      public.bookings.customer_id = auth.uid()
      or public.artisans.profile_id = auth.uid()
      or public.current_user_role() = 'admin'
    )
  )
);

drop policy if exists "Admins can manage booking attachments" on public.booking_attachments;
create policy "Admins can manage booking attachments"
on public.booking_attachments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Customers can upload own booking attachment files" on storage.objects;
create policy "Customers can upload own booking attachment files"
on storage.objects for insert
with check (
  bucket_id = 'handiwave-booking-attachments'
  and auth.role() = 'authenticated'
  and exists (
    select 1
    from public.bookings
    where public.bookings.id::text = (storage.foldername(name))[1]
    and public.bookings.customer_id = auth.uid()
  )
);

drop policy if exists "Booking participants can read booking attachment files" on storage.objects;
create policy "Booking participants can read booking attachment files"
on storage.objects for select
using (
  bucket_id = 'handiwave-booking-attachments'
  and exists (
    select 1
    from public.bookings
    left join public.artisans on public.artisans.id = public.bookings.artisan_id
    where public.bookings.id::text = (storage.foldername(name))[1]
    and (
      public.bookings.customer_id = auth.uid()
      or public.artisans.profile_id = auth.uid()
      or public.current_user_role() = 'admin'
    )
  )
);

drop policy if exists "Admins can manage booking attachment files" on storage.objects;
create policy "Admins can manage booking attachment files"
on storage.objects for all
using (
  bucket_id = 'handiwave-booking-attachments'
  and public.current_user_role() = 'admin'
)
with check (
  bucket_id = 'handiwave-booking-attachments'
  and public.current_user_role() = 'admin'
);
