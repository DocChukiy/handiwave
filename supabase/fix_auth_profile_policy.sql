-- Handiwave auth profile repair policy
-- Run this if signup/login succeeds in Supabase Auth but the frontend cannot
-- find a matching row in public.profiles.
--
-- This does not allow users to create admin profiles. It only lets an
-- authenticated user create their own customer/artisan profile if the auth
-- trigger did not create it first.

drop policy if exists "Users can insert own non-admin profile" on public.profiles;

create policy "Users can insert own non-admin profile"
on public.profiles for insert
with check (
  auth.uid() = id
  and role in ('customer', 'artisan')
);
