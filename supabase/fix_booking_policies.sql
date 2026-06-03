-- Handiwave booking insert/read policies
-- Run this in Supabase SQL Editor if booking inserts fail with an RLS error
-- or if booking history is empty despite existing rows.

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
