drop policy if exists "Admins can read all conversations" on public.conversations;
create policy "Admins can read all conversations"
on public.conversations for select
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Admins can update conversation activity" on public.conversations;
create policy "Admins can update conversation activity"
on public.conversations for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can read all messages" on public.messages;
create policy "Admins can read all messages"
on public.messages for select
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Admins can send support messages" on public.messages;
create policy "Admins can send support messages"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.current_user_role() = 'admin'
);
