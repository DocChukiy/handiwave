-- Handiwave booking reschedule support
-- Run once in Supabase SQL Editor before using artisan-side time suggestions.

alter type public.booking_status add value if not exists 'reschedule_requested';

alter table public.bookings
  add column if not exists proposed_date date,
  add column if not exists proposed_time time,
  add column if not exists reschedule_note text,
  add column if not exists proposed_by text,
  add column if not exists reschedule_requested_at timestamptz;

comment on column public.bookings.proposed_date is 'New date proposed during booking reschedule negotiation.';
comment on column public.bookings.proposed_time is 'New time proposed during booking reschedule negotiation.';
comment on column public.bookings.reschedule_note is 'Optional note explaining the proposed schedule change.';
comment on column public.bookings.proposed_by is 'Who proposed the schedule change, e.g. artisan or customer.';
comment on column public.bookings.reschedule_requested_at is 'Timestamp when the reschedule request was created.';
