alter table public.artisans
  add column if not exists profile_completion smallint not null default 0,
  add column if not exists verification_ready boolean not null default false,
  add column if not exists verification_ready_at timestamptz,
  add column if not exists verification_tier text not null default 'building',
  add column if not exists work_evidence_count integer not null default 0,
  add column if not exists bid_activity_count integer not null default 0,
  add column if not exists tier_updated_at timestamptz;

alter table public.artisans
  drop constraint if exists artisans_profile_completion_check,
  add constraint artisans_profile_completion_check
    check (profile_completion between 0 and 100),
  drop constraint if exists artisans_verification_tier_check,
  add constraint artisans_verification_tier_check
    check (verification_tier in ('building', 'ready', 'verified', 'trusted', 'elite'));

create table if not exists public.public_professional_directory (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  artisan_id uuid unique references public.artisans(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  business_name text,
  bio text,
  primary_service_id uuid references public.services(id) on delete set null,
  primary_service_name text,
  primary_service_category text,
  primary_service_icon text,
  years_experience integer not null default 0,
  city text,
  state text,
  service_area text,
  starting_price numeric(12,2),
  verification_status text not null default 'incomplete',
  verification_tier text not null default 'building',
  verification_ready boolean not null default false,
  profile_completion smallint not null default 0,
  work_evidence_count integer not null default 0,
  bid_activity_count integer not null default 0,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  completed_jobs integer not null default 0,
  is_available boolean not null default false,
  ranking_score numeric(12,2) not null default 0,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_professional_directory_completion_check
    check (profile_completion between 0 and 100),
  constraint public_professional_directory_tier_check
    check (verification_tier in ('building', 'ready', 'verified', 'trusted', 'elite'))
);

create index if not exists public_professional_directory_ranking_idx
  on public.public_professional_directory (ranking_score desc, joined_at desc);
create index if not exists public_professional_directory_service_idx
  on public.public_professional_directory (primary_service_id);
create index if not exists public_professional_directory_location_idx
  on public.public_professional_directory (state, city);

alter table public.public_professional_directory enable row level security;
revoke all on table public.public_professional_directory from anon, authenticated;
grant select on table public.public_professional_directory to anon, authenticated;

drop policy if exists "Public professional directory is readable" on public.public_professional_directory;
create policy "Public professional directory is readable"
on public.public_professional_directory for select
to anon, authenticated
using (true);

create or replace function public.refresh_professional_directory(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  professional public.artisans%rowtype;
  professional_profile public.profiles%rowtype;
  service_record public.services%rowtype;
  evidence_total integer := 0;
  bids_total integer := 0;
  completed_items integer := 0;
  completion_value integer := 0;
  ready_value boolean := false;
  old_ready_value boolean := false;
  old_tier_value text := 'building';
  tier_value text := 'building';
  tier_score integer := 0;
begin
  select * into professional_profile
  from public.profiles
  where id = target_profile_id;

  if not found or professional_profile.role <> 'artisan'::public.user_role then
    delete from public.public_professional_directory where profile_id = target_profile_id;
    return;
  end if;

  select * into professional
  from public.artisans
  where profile_id = target_profile_id;

  if professional.id is null then
    insert into public.public_professional_directory (
      profile_id,
      full_name,
      avatar_url,
      city,
      state,
      verification_status,
      verification_tier,
      joined_at,
      updated_at
    ) values (
      professional_profile.id,
      professional_profile.full_name,
      professional_profile.avatar_url,
      professional_profile.city,
      professional_profile.state,
      'incomplete',
      'building',
      professional_profile.created_at,
      now()
    )
    on conflict (profile_id) do update set
      artisan_id = null,
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      city = excluded.city,
      state = excluded.state,
      business_name = null,
      bio = null,
      primary_service_id = null,
      primary_service_name = null,
      primary_service_category = null,
      primary_service_icon = null,
      years_experience = 0,
      service_area = null,
      starting_price = null,
      verification_status = 'incomplete',
      verification_tier = 'building',
      verification_ready = false,
      profile_completion = 0,
      work_evidence_count = 0,
      bid_activity_count = 0,
      average_rating = 0,
      review_count = 0,
      completed_jobs = 0,
      is_available = false,
      ranking_score = 0,
      updated_at = now();
    return;
  end if;

  select * into service_record
  from public.services
  where id = professional.primary_service_id;

  select count(*)::integer into evidence_total
  from public.reels
  where artisan_id = professional.id
    and coalesce(video_path, video_url) is not null;

  select count(*)::integer into bids_total
  from public.service_request_bids
  where artisan_id = professional.id;

  completed_items :=
    (case when nullif(trim(professional.business_name), '') is not null then 1 else 0 end) +
    (case when length(trim(coalesce(professional.bio, ''))) >= 40 then 1 else 0 end) +
    (case when professional.primary_service_id is not null then 1 else 0 end) +
    (case when nullif(trim(professional.city), '') is not null
                and nullif(trim(professional.state), '') is not null
                and nullif(trim(coalesce(professional.service_area, '')), '') is not null then 1 else 0 end) +
    (case when professional.years_experience > 0 then 1 else 0 end) +
    (case when professional.starting_price > 0 then 1 else 0 end) +
    (case when evidence_total > 0 then 1 else 0 end);

  completion_value := round((completed_items::numeric / 7) * 100)::integer;
  ready_value := completion_value = 100 and professional.verification_status = 'pending'::public.verification_status;
  old_ready_value := professional.verification_ready;
  old_tier_value := professional.verification_tier;

  if professional.verification_status = 'verified'::public.verification_status then
    if professional.completed_jobs >= 25
      and professional.review_count >= 15
      and professional.average_rating >= 4.7
      and bids_total >= 20 then
      tier_value := 'elite';
      tier_score := 500;
    elsif professional.completed_jobs >= 5
      and professional.review_count >= 3
      and professional.average_rating >= 4.2 then
      tier_value := 'trusted';
      tier_score := 400;
    else
      tier_value := 'verified';
      tier_score := 300;
    end if;
  elsif ready_value then
    tier_value := 'ready';
    tier_score := 200;
  else
    tier_value := 'building';
    tier_score := 100;
  end if;

  update public.artisans
  set profile_completion = completion_value,
      verification_ready = ready_value,
      verification_ready_at = case
        when ready_value and not old_ready_value then now()
        when ready_value then verification_ready_at
        else null
      end,
      verification_tier = tier_value,
      work_evidence_count = evidence_total,
      bid_activity_count = bids_total,
      tier_updated_at = case when old_tier_value is distinct from tier_value then now() else tier_updated_at end
  where id = professional.id;

  insert into public.public_professional_directory (
    profile_id,
    artisan_id,
    full_name,
    avatar_url,
    business_name,
    bio,
    primary_service_id,
    primary_service_name,
    primary_service_category,
    primary_service_icon,
    years_experience,
    city,
    state,
    service_area,
    starting_price,
    verification_status,
    verification_tier,
    verification_ready,
    profile_completion,
    work_evidence_count,
    bid_activity_count,
    average_rating,
    review_count,
    completed_jobs,
    is_available,
    ranking_score,
    joined_at,
    updated_at
  ) values (
    professional_profile.id,
    professional.id,
    professional_profile.full_name,
    professional_profile.avatar_url,
    professional.business_name,
    professional.bio,
    professional.primary_service_id,
    service_record.name,
    service_record.category,
    service_record.icon,
    professional.years_experience,
    professional.city,
    professional.state,
    professional.service_area,
    professional.starting_price,
    professional.verification_status::text,
    tier_value,
    ready_value,
    completion_value,
    evidence_total,
    bids_total,
    professional.average_rating,
    professional.review_count,
    professional.completed_jobs,
    professional.is_available,
    tier_score
      + completion_value
      + least(professional.completed_jobs, 100)
      + least(professional.review_count * 2, 50)
      + least(bids_total, 25)
      + (professional.average_rating * 10),
    professional.created_at,
    now()
  )
  on conflict (profile_id) do update set
    artisan_id = excluded.artisan_id,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    business_name = excluded.business_name,
    bio = excluded.bio,
    primary_service_id = excluded.primary_service_id,
    primary_service_name = excluded.primary_service_name,
    primary_service_category = excluded.primary_service_category,
    primary_service_icon = excluded.primary_service_icon,
    years_experience = excluded.years_experience,
    city = excluded.city,
    state = excluded.state,
    service_area = excluded.service_area,
    starting_price = excluded.starting_price,
    verification_status = excluded.verification_status,
    verification_tier = excluded.verification_tier,
    verification_ready = excluded.verification_ready,
    profile_completion = excluded.profile_completion,
    work_evidence_count = excluded.work_evidence_count,
    bid_activity_count = excluded.bid_activity_count,
    average_rating = excluded.average_rating,
    review_count = excluded.review_count,
    completed_jobs = excluded.completed_jobs,
    is_available = excluded.is_available,
    ranking_score = excluded.ranking_score,
    joined_at = excluded.joined_at,
    updated_at = now();

  if ready_value and not old_ready_value then
    insert into public.notifications (profile_id, type, title, body, data)
    select
      admin_profile.id,
      'system'::public.notification_type,
      'Professional ready for verification',
      coalesce(professional.business_name, professional_profile.full_name) || ' completed the core verification checklist.',
      jsonb_build_object(
        'artisan_id', professional.id,
        'profile_id', professional_profile.id,
        'destination', '/admin/professionals'
      )
    from public.profiles admin_profile
    where admin_profile.role = 'admin'::public.user_role
      and admin_profile.is_active = true;
  end if;

  if old_tier_value is distinct from tier_value and tier_value in ('trusted', 'elite') then
    insert into public.notifications (profile_id, type, title, body, data)
    values (
      professional_profile.id,
      'system'::public.notification_type,
      case when tier_value = 'elite' then 'Elite Professional unlocked' else 'Trusted Professional unlocked' end,
      'Your performance has moved your Handiwave profile to the ' || tier_value || ' tier, improving your marketplace visibility.',
      jsonb_build_object('artisan_id', professional.id, 'tier', tier_value, 'destination', '/artisan-dashboard')
    );
  end if;
end;
$$;

revoke all on function public.refresh_professional_directory(uuid) from public, anon, authenticated;

create or replace function public.sync_professional_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_professional_directory(new.id);
  return new;
end;
$$;

create or replace function public.sync_professional_from_artisan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_professional_directory(coalesce(new.profile_id, old.profile_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_professional_from_reel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
begin
  select profile_id into target_profile_id
  from public.artisans
  where id = coalesce(new.artisan_id, old.artisan_id);

  if target_profile_id is not null then
    perform public.refresh_professional_directory(target_profile_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.sync_professional_from_bid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
begin
  select profile_id into target_profile_id
  from public.artisans
  where id = coalesce(new.artisan_id, old.artisan_id);

  if target_profile_id is not null then
    perform public.refresh_professional_directory(target_profile_id);
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_professional_from_profile() from public, anon, authenticated;
revoke all on function public.sync_professional_from_artisan() from public, anon, authenticated;
revoke all on function public.sync_professional_from_reel() from public, anon, authenticated;
revoke all on function public.sync_professional_from_bid() from public, anon, authenticated;

drop trigger if exists profiles_sync_professional_directory on public.profiles;
create trigger profiles_sync_professional_directory
after insert or update
on public.profiles
for each row execute function public.sync_professional_from_profile();

drop trigger if exists artisans_sync_professional_directory on public.artisans;
drop trigger if exists artisans_insert_professional_directory on public.artisans;
drop trigger if exists artisans_update_professional_directory on public.artisans;
drop trigger if exists artisans_delete_professional_directory on public.artisans;
create trigger artisans_insert_professional_directory
after insert
on public.artisans
for each row execute function public.sync_professional_from_artisan();

create trigger artisans_update_professional_directory
after update of
  primary_service_id,
  business_name,
  bio,
  years_experience,
  verification_status,
  average_rating,
  completed_jobs,
  starting_price,
  city,
  state,
  service_area,
  is_available,
  review_count
on public.artisans
for each row execute function public.sync_professional_from_artisan();

create trigger artisans_delete_professional_directory
after delete
on public.artisans
for each row execute function public.sync_professional_from_artisan();

drop trigger if exists reels_sync_professional_directory on public.reels;
create trigger reels_sync_professional_directory
after insert or update or delete
on public.reels
for each row execute function public.sync_professional_from_reel();

drop trigger if exists bids_sync_professional_directory on public.service_request_bids;
create trigger bids_sync_professional_directory
after insert or update or delete
on public.service_request_bids
for each row execute function public.sync_professional_from_bid();

create or replace function public.notify_professional_verification_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.verification_status is distinct from new.verification_status then
    insert into public.notifications (profile_id, type, title, body, data)
    values (
      new.profile_id,
      'system'::public.notification_type,
      case new.verification_status
        when 'verified'::public.verification_status then 'Verification approved'
        when 'rejected'::public.verification_status then 'Verification needs attention'
        when 'suspended'::public.verification_status then 'Profile verification suspended'
        else 'Verification review updated'
      end,
      case new.verification_status
        when 'verified'::public.verification_status then 'Your Handiwave profile is verified and can now receive direct booking requests.'
        when 'rejected'::public.verification_status then coalesce(new.verification_notes, 'Review the requested updates before applying again.')
        when 'suspended'::public.verification_status then coalesce(new.verification_notes, 'Contact Handiwave support for the next steps.')
        else coalesce(new.verification_notes, 'Complete the outstanding checklist items and your profile will return to the review queue.')
      end,
      jsonb_build_object('artisan_id', new.id, 'status', new.verification_status, 'destination', '/artisan-dashboard')
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_professional_verification_change() from public, anon, authenticated;

drop trigger if exists artisans_notify_verification_change on public.artisans;
create trigger artisans_notify_verification_change
after update of verification_status on public.artisans
for each row execute function public.notify_professional_verification_change();

do $$
declare
  profile_record record;
begin
  for profile_record in
    select id from public.profiles where role = 'artisan'::public.user_role
  loop
    perform public.refresh_professional_directory(profile_record.id);
  end loop;
end;
$$;
