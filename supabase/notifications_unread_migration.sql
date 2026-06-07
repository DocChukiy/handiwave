-- Handiwave unread messages and notifications support
-- Run once in Supabase SQL Editor before using unread counts/notifications.

drop policy if exists "Conversation participants can mark messages read" on public.messages;
create policy "Conversation participants can mark messages read"
on public.messages for update
using (
  exists (
    select 1
    from public.conversations
    where public.conversations.id = messages.conversation_id
    and (
      public.conversations.customer_id = auth.uid()
      or exists (
        select 1
        from public.artisans
        where public.artisans.id = public.conversations.artisan_id
        and public.artisans.profile_id = auth.uid()
      )
    )
  )
)
with check (
  exists (
    select 1
    from public.conversations
    where public.conversations.id = messages.conversation_id
    and (
      public.conversations.customer_id = auth.uid()
      or exists (
        select 1
        from public.artisans
        where public.artisans.id = public.conversations.artisan_id
        and public.artisans.profile_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Authenticated users can create participant notifications" on public.notifications;
create policy "Authenticated users can create participant notifications"
on public.notifications for insert
with check (
  auth.uid() is not null
  and profile_id <> auth.uid()
  and (
    type <> 'message'
    or exists (
      select 1
      from public.conversations
      where public.conversations.id = (notifications.data->>'conversation_id')::uuid
      and (
        public.conversations.customer_id = auth.uid()
        or exists (
          select 1
          from public.artisans
          where public.artisans.id = public.conversations.artisan_id
          and public.artisans.profile_id = auth.uid()
        )
      )
      and (
        public.conversations.customer_id = notifications.profile_id
        or exists (
          select 1
          from public.artisans receiver_artisan
          where receiver_artisan.id = public.conversations.artisan_id
          and receiver_artisan.profile_id = notifications.profile_id
        )
      )
    )
  )
);
