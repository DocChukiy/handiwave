insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'handiwave-reel-videos',
    'handiwave-reel-videos',
    false,
    52428800,
    array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
  ),
  (
    'handiwave-reel-thumbnails',
    'handiwave-reel-thumbnails',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Professionals can upload own reel files" on storage.objects;
create policy "Professionals can upload own reel files"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('handiwave-reel-videos', 'handiwave-reel-thumbnails')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Professionals can read own reel files" on storage.objects;
drop policy if exists "Controlled reel media access" on storage.objects;
create policy "Controlled reel media access"
on storage.objects for select
using (
  bucket_id in ('handiwave-reel-videos', 'handiwave-reel-thumbnails')
  and (
    owner_id = (select auth.uid())::text
    or public.is_admin()
    or exists (
      select 1
      from public.reels
      join public.artisans on public.artisans.id = public.reels.artisan_id
      where public.reels.status = 'published'::public.reel_status
        and public.artisans.verification_status = 'verified'::public.verification_status
        and public.artisans.is_available = true
        and (
          (bucket_id = 'handiwave-reel-videos' and public.reels.video_path = name)
          or (bucket_id = 'handiwave-reel-thumbnails' and public.reels.thumbnail_path = name)
        )
    )
  )
);

drop policy if exists "Professionals can update own reel files" on storage.objects;
create policy "Professionals can update own reel files"
on storage.objects for update
to authenticated
using (
  bucket_id in ('handiwave-reel-videos', 'handiwave-reel-thumbnails')
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id in ('handiwave-reel-videos', 'handiwave-reel-thumbnails')
  and owner_id = (select auth.uid())::text
);

drop policy if exists "Professionals can delete own reel files" on storage.objects;
create policy "Professionals can delete own reel files"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('handiwave-reel-videos', 'handiwave-reel-thumbnails')
  and owner_id = (select auth.uid())::text
);

create or replace function public.enforce_professional_verification_readiness()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.verification_status = 'verified'::public.verification_status
    and old.verification_status is distinct from 'verified'::public.verification_status
    and not old.verification_ready then
    raise exception 'Professional must complete the core verification checklist before approval.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_professional_verification_readiness() from public, anon, authenticated;

drop trigger if exists artisans_enforce_verification_readiness on public.artisans;
create trigger artisans_enforce_verification_readiness
before update of verification_status on public.artisans
for each row execute function public.enforce_professional_verification_readiness();
