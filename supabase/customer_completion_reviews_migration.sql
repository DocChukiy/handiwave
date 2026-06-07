-- Handiwave customer completion and reviews migration
-- Run this once in Supabase SQL Editor before using the customer review flow.

alter type public.booking_status add value if not exists 'artisan_completed';
alter type public.booking_status add value if not exists 'customer_confirmed';

alter table public.artisans
add column if not exists review_count integer not null default 0 check (review_count >= 0);

create or replace function public.refresh_artisan_review_stats(target_artisan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.artisans
  set
    average_rating = coalesce((
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where artisan_id = target_artisan_id
      and is_verified = true
    ), 0),
    review_count = (
      select count(*)::integer
      from public.reviews
      where artisan_id = target_artisan_id
      and is_verified = true
    ),
    completed_jobs = (
      select count(*)::integer
      from public.bookings
      where artisan_id = target_artisan_id
      and status::text = 'customer_confirmed'
    ),
    updated_at = now()
  where id = target_artisan_id;
end;
$$;

create or replace function public.refresh_artisan_review_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_artisan_review_stats(coalesce(new.artisan_id, old.artisan_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_artisan_stats on public.reviews;
create trigger reviews_refresh_artisan_stats
after insert or update or delete on public.reviews
for each row execute function public.refresh_artisan_review_stats_trigger();

create or replace function public.refresh_artisan_completed_jobs_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text = 'customer_confirmed' or old.status::text = 'customer_confirmed' then
    perform public.refresh_artisan_review_stats(new.artisan_id);
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_refresh_artisan_completed_jobs on public.bookings;
create trigger bookings_refresh_artisan_completed_jobs
after update of status on public.bookings
for each row execute function public.refresh_artisan_completed_jobs_trigger();

drop policy if exists "Customers can create reviews for completed own bookings" on public.reviews;
drop policy if exists "Customers can create reviews for customer confirmed bookings" on public.reviews;
create policy "Customers can create reviews for customer confirmed bookings"
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
    and public.bookings.status::text = 'customer_confirmed'
  )
);

drop policy if exists "Customers can confirm own artisan completed bookings" on public.bookings;
create policy "Customers can confirm own artisan completed bookings"
on public.bookings for update
using (
  auth.uid() = customer_id
  and status::text = 'artisan_completed'
)
with check (
  auth.uid() = customer_id
  and status::text in ('customer_confirmed', 'disputed')
);
