create or replace function public.normalize_nigerian_state(state_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(trim(coalesce(state_value, ''))) in (
      'abuja',
      'fct',
      'federal capital territory',
      'federal capital territory abuja'
    ) then 'FCT'
    when lower(trim(coalesce(state_value, ''))) in ('kaduna', 'kaduna state') then 'Kaduna'
    else regexp_replace(trim(coalesce(state_value, '')), '\s+state$', '', 'i')
  end;
$$;

revoke all on function public.normalize_nigerian_state(text) from public;
revoke all on function public.normalize_nigerian_state(text) from anon;
grant execute on function public.normalize_nigerian_state(text) to authenticated;

update public.profiles
set state = public.normalize_nigerian_state(state)
where state is not null;

update public.artisans
set state = public.normalize_nigerian_state(state);

update public.service_requests
set state = public.normalize_nigerian_state(state);

alter policy "Matched professionals can read open service requests"
on public.service_requests
using (
  status = 'open'
  and expires_at > now()
  and exists (
    select 1
    from public.artisans
    where public.artisans.profile_id = (select auth.uid())
      and public.artisans.verification_status = 'verified'
      and public.artisans.is_available = true
      and public.normalize_nigerian_state(public.artisans.state) = public.normalize_nigerian_state(service_requests.state)
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

alter policy "Matched professionals can submit bids"
on public.service_request_bids
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
      and public.normalize_nigerian_state(public.artisans.state) = public.normalize_nigerian_state(public.service_requests.state)
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

alter policy "Professionals can update own submitted bids"
on public.service_request_bids
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
      and public.normalize_nigerian_state(public.artisans.state) = public.normalize_nigerian_state(public.service_requests.state)
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
