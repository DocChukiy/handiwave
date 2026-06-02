-- Handiwave booking profile visibility policy
-- Run this if booking history loads but customer/artisan names are missing
-- from embedded profile data.

drop policy if exists "Booking participants can read related profiles" on public.profiles;

create policy "Booking participants can read related profiles"
on public.profiles for select
using (
  exists (
    select 1
    from public.bookings
    join public.artisans on public.artisans.id = public.bookings.artisan_id
    where (
      public.bookings.customer_id = profiles.id
      and public.artisans.profile_id = auth.uid()
    )
    or (
      public.bookings.customer_id = auth.uid()
      and public.artisans.profile_id = profiles.id
    )
  )
);
