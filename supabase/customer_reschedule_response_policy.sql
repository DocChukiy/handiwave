-- Handiwave customer reschedule response policy
-- Run this if customer Accept/Reject New Time actions fail with an RLS update error.

drop policy if exists "Customers can respond to own reschedule requests" on public.bookings;

create policy "Customers can respond to own reschedule requests"
on public.bookings for update
using (
  auth.uid() = customer_id
  and status = 'reschedule_requested'
)
with check (
  auth.uid() = customer_id
  and status in ('confirmed', 'pending')
  and proposed_date is null
  and proposed_time is null
  and reschedule_note is null
  and proposed_by is null
  and reschedule_requested_at is null
);
