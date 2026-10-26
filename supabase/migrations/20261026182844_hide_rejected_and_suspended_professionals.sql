drop policy if exists "Public professional directory is readable" on public.public_professional_directory;
create policy "Public professional directory is readable"
on public.public_professional_directory for select
to anon, authenticated
using (verification_status not in ('rejected', 'suspended'));
