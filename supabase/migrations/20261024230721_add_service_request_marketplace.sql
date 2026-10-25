create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'awarded', 'cancelled', 'expired')),
  issue_title text not null,
  issue_details text not null,
  diagnosis_answers jsonb not null default '{}'::jsonb,
  urgency text not null default 'flexible' check (urgency in ('urgent', 'today', 'this_week', 'flexible')),
  preferred_date date,
  preferred_time time,
  city text not null,
  state text not null,
  materials_preference text not null default 'professional_to_advise' check (
    materials_preference in ('customer_has_materials', 'professional_to_supply', 'professional_to_advise')
  ),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  accepted_bid_id uuid,
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_request_private_details (
  request_id uuid primary key references public.service_requests (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  location_address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_request_bids (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected', 'withdrawn', 'expired')),
  pricing_type text not null check (pricing_type in ('fixed', 'range', 'inspection')),
  labor_amount numeric(12, 2) check (labor_amount is null or labor_amount >= 0),
  materials_estimate numeric(12, 2) check (materials_estimate is null or materials_estimate >= 0),
  minimum_total numeric(12, 2) check (minimum_total is null or minimum_total >= 0),
  maximum_total numeric(12, 2) check (maximum_total is null or maximum_total >= 0),
  inspection_fee numeric(12, 2) check (inspection_fee is null or inspection_fee >= 0),
  available_date date,
  available_time time,
  duration_estimate text,
  message text not null,
  guarantee_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, artisan_id),
  check (
    (pricing_type = 'fixed' and coalesce(labor_amount, 0) + coalesce(materials_estimate, 0) > 0)
    or (pricing_type = 'range' and minimum_total is not null and maximum_total is not null and maximum_total >= minimum_total)
    or (pricing_type = 'inspection' and inspection_fee is not null and inspection_fee >= 0)
  )
);

alter table public.service_requests
drop constraint if exists service_requests_accepted_bid_id_fkey;

alter table public.service_requests
add constraint service_requests_accepted_bid_id_fkey
foreign key (accepted_bid_id) references public.service_request_bids (id) on delete set null;

create index if not exists service_requests_matching_idx
on public.service_requests (status, service_id, state, city, expires_at);

create index if not exists service_request_bids_request_idx
on public.service_request_bids (request_id, status, created_at);

create index if not exists service_request_bids_artisan_idx
on public.service_request_bids (artisan_id, status, created_at);

create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

create trigger service_request_bids_set_updated_at
before update on public.service_request_bids
for each row execute function public.set_updated_at();

create trigger service_request_private_details_set_updated_at
before update on public.service_request_private_details
for each row execute function public.set_updated_at();

alter table public.service_requests enable row level security;
alter table public.service_request_bids enable row level security;
alter table public.service_request_private_details enable row level security;

grant select, insert, update on table public.service_requests to authenticated;
grant select, insert, update on table public.service_request_bids to authenticated;
grant select, insert, update on table public.service_request_private_details to authenticated;

create policy "Customers can create own service requests"
on public.service_requests for insert
to authenticated
with check (
  (select auth.uid()) = customer_id
  and public.current_user_role() = 'customer'
);

create policy "Customers can read own service requests"
on public.service_requests for select
to authenticated
using ((select auth.uid()) = customer_id);

create policy "Customers can manage own service request private details"
on public.service_request_private_details for all
to authenticated
using ((select auth.uid()) = customer_id)
with check (
  (select auth.uid()) = customer_id
  and exists (
    select 1
    from public.service_requests
    where public.service_requests.id = service_request_private_details.request_id
      and public.service_requests.customer_id = (select auth.uid())
  )
);

create policy "Matched professionals can read open service requests"
on public.service_requests for select
to authenticated
using (
  status = 'open'
  and expires_at > now()
  and exists (
    select 1
    from public.artisans
    where public.artisans.profile_id = (select auth.uid())
      and public.artisans.verification_status = 'verified'
      and public.artisans.is_available = true
      and lower(public.artisans.state) = lower(service_requests.state)
      and (
        public.artisans.primary_service_id = service_requests.service_id
        or exists (
          select 1
          from public.artisan_services
          where public.artisan_services.artisan_id = public.artisans.id
            and public.artisan_services.service_id = service_requests.service_id
        )
      )
  )
);

create policy "Customers can read bids on own requests"
on public.service_request_bids for select
to authenticated
using (
  exists (
    select 1
    from public.service_requests
    where public.service_requests.id = service_request_bids.request_id
      and public.service_requests.customer_id = (select auth.uid())
  )
);

create policy "Professionals can read own bids"
on public.service_request_bids for select
to authenticated
using (
  exists (
    select 1
    from public.artisans
    where public.artisans.id = service_request_bids.artisan_id
      and public.artisans.profile_id = (select auth.uid())
  )
);

create policy "Matched professionals can submit bids"
on public.service_request_bids for insert
to authenticated
with check (
  status = 'submitted'
  and exists (
    select 1
    from public.artisans
    join public.service_requests on public.service_requests.id = service_request_bids.request_id
    where public.artisans.id = service_request_bids.artisan_id
      and public.artisans.profile_id = (select auth.uid())
      and public.artisans.verification_status = 'verified'
      and public.artisans.is_available = true
      and public.service_requests.status = 'open'
      and public.service_requests.expires_at > now()
      and lower(public.artisans.state) = lower(public.service_requests.state)
      and (
        public.artisans.primary_service_id = public.service_requests.service_id
        or exists (
          select 1
          from public.artisan_services
          where public.artisan_services.artisan_id = public.artisans.id
            and public.artisan_services.service_id = public.service_requests.service_id
        )
      )
  )
);

create policy "Professionals can update own submitted bids"
on public.service_request_bids for update
to authenticated
using (
  status = 'submitted'
  and exists (
    select 1
    from public.artisans
    where public.artisans.id = service_request_bids.artisan_id
      and public.artisans.profile_id = (select auth.uid())
  )
)
with check (
  status in ('submitted', 'withdrawn')
  and exists (
    select 1
    from public.artisans
    join public.service_requests on public.service_requests.id = service_request_bids.request_id
    where public.artisans.id = service_request_bids.artisan_id
      and public.artisans.profile_id = (select auth.uid())
      and public.artisans.verification_status = 'verified'
      and public.service_requests.status = 'open'
      and public.service_requests.expires_at > now()
      and lower(public.artisans.state) = lower(public.service_requests.state)
      and (
        public.artisans.primary_service_id = public.service_requests.service_id
        or exists (
          select 1
          from public.artisan_services
          where public.artisan_services.artisan_id = public.artisans.id
            and public.artisan_services.service_id = public.service_requests.service_id
        )
      )
  )
);

create policy "Admins can manage service requests"
on public.service_requests for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Admins can manage service request bids"
on public.service_request_bids for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "Admins can manage service request private details"
on public.service_request_private_details for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create or replace function public.create_service_request(
  target_service_id uuid,
  target_issue_title text,
  target_issue_details text,
  target_diagnosis_answers jsonb,
  target_urgency text,
  target_preferred_date date,
  target_preferred_time time,
  target_location_address text,
  target_city text,
  target_state text,
  target_materials_preference text
)
returns public.service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.service_requests;
begin
  if (select auth.uid()) is null or public.current_user_role() <> 'customer' then
    raise exception 'Only signed-in customers can create service requests.';
  end if;

  if nullif(trim(target_issue_title), '') is null
    or nullif(trim(target_issue_details), '') is null
    or nullif(trim(target_location_address), '') is null
    or nullif(trim(target_city), '') is null
    or nullif(trim(target_state), '') is null then
    raise exception 'Service, issue, and location details are required.';
  end if;

  insert into public.service_requests (
    customer_id,
    service_id,
    issue_title,
    issue_details,
    diagnosis_answers,
    urgency,
    preferred_date,
    preferred_time,
    city,
    state,
    materials_preference
  ) values (
    (select auth.uid()),
    target_service_id,
    trim(target_issue_title),
    trim(target_issue_details),
    coalesce(target_diagnosis_answers, '{}'::jsonb),
    target_urgency,
    target_preferred_date,
    target_preferred_time,
    trim(target_city),
    trim(target_state),
    target_materials_preference
  )
  returning * into request_row;

  insert into public.service_request_private_details (request_id, customer_id, location_address)
  values (request_row.id, (select auth.uid()), trim(target_location_address));

  return request_row;
end;
$$;

revoke all on function public.create_service_request(uuid, text, text, jsonb, text, date, time, text, text, text, text) from public;
revoke all on function public.create_service_request(uuid, text, text, jsonb, text, date, time, text, text, text, text) from anon;
grant execute on function public.create_service_request(uuid, text, text, jsonb, text, date, time, text, text, text, text) to authenticated;

create or replace function public.accept_service_request_bid(
  target_request_id uuid,
  target_bid_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.service_requests;
  bid_row public.service_request_bids;
  booking_row public.bookings;
  private_row public.service_request_private_details;
  accepted_price numeric(12, 2);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;

  select * into request_row
  from public.service_requests
  where id = target_request_id
    and customer_id = (select auth.uid())
    and status = 'open'
  for update;

  if request_row.id is null then
    raise exception 'Open service request not found.';
  end if;

  select * into private_row
  from public.service_request_private_details
  where request_id = target_request_id
    and customer_id = (select auth.uid());

  if private_row.request_id is null then
    raise exception 'Service address not found.';
  end if;

  select * into bid_row
  from public.service_request_bids
  where id = target_bid_id
    and request_id = target_request_id
    and status = 'submitted'
  for update;

  if bid_row.id is null then
    raise exception 'Submitted offer not found.';
  end if;

  accepted_price := case bid_row.pricing_type
    when 'fixed' then coalesce(bid_row.labor_amount, 0) + coalesce(bid_row.materials_estimate, 0)
    when 'range' then bid_row.maximum_total
    else bid_row.inspection_fee
  end;

  insert into public.bookings (
    customer_id,
    artisan_id,
    service_id,
    status,
    payment_status,
    scheduled_date,
    scheduled_time,
    location_address,
    city,
    state,
    notes,
    estimated_price,
    quoted_price,
    quote_notes,
    quote_sent_at,
    quote_accepted_at
  ) values (
    request_row.customer_id,
    bid_row.artisan_id,
    request_row.service_id,
    'pending',
    'unpaid',
    coalesce(bid_row.available_date, request_row.preferred_date),
    coalesce(bid_row.available_time, request_row.preferred_time),
    private_row.location_address,
    request_row.city,
    request_row.state,
    request_row.issue_title || E'\n\n' || request_row.issue_details,
    accepted_price,
    accepted_price,
    bid_row.message,
    now(),
    now()
  )
  returning * into booking_row;

  update public.service_request_bids
  set status = case when id = target_bid_id then 'accepted' else 'rejected' end
  where request_id = target_request_id
    and status = 'submitted';

  update public.service_requests
  set status = 'awarded', accepted_bid_id = target_bid_id, booking_id = booking_row.id
  where id = target_request_id;

  insert into public.conversations (booking_id, customer_id, artisan_id)
  values (booking_row.id, request_row.customer_id, bid_row.artisan_id)
  on conflict (booking_id) where booking_id is not null do nothing;

  return booking_row;
end;
$$;

revoke all on function public.accept_service_request_bid(uuid, uuid) from public;
revoke all on function public.accept_service_request_bid(uuid, uuid) from anon;
grant execute on function public.accept_service_request_bid(uuid, uuid) to authenticated;
