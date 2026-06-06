-- Handiwave artisan booking status update policy
-- Run this if artisan dashboard action buttons fail with an RLS error.

drop policy if exists "Artisans can update assigned booking status" on public.bookings;

create policy "Artisans can update assigned booking status"
on public.bookings for update
using (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = bookings.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = bookings.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
);
