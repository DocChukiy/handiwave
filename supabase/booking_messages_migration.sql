-- Handiwave booking-based messaging migration
-- Run once in Supabase SQL Editor before using real booking chats.

create unique index if not exists conversations_booking_id_unique_idx
on public.conversations (booking_id)
where booking_id is not null;

drop policy if exists "Booking participants can create conversations" on public.conversations;
create policy "Booking participants can create conversations"
on public.conversations for insert
with check (
  exists (
    select 1
    from public.bookings
    where public.bookings.id = conversations.booking_id
    and public.bookings.customer_id = conversations.customer_id
    and public.bookings.artisan_id = conversations.artisan_id
    and (
      public.bookings.customer_id = auth.uid()
      or exists (
        select 1
        from public.artisans
        where public.artisans.id = public.bookings.artisan_id
        and public.artisans.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Conversation participants can update conversation activity" on public.conversations;
create policy "Conversation participants can update conversation activity"
on public.conversations for update
using (
  auth.uid() = customer_id
  or exists (
    select 1
    from public.artisans
    where public.artisans.id = conversations.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
)
with check (
  auth.uid() = customer_id
  or exists (
    select 1
    from public.artisans
    where public.artisans.id = conversations.artisan_id
    and public.artisans.profile_id = auth.uid()
  )
);
