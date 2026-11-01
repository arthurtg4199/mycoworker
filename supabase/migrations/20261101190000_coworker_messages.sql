-- Private chat between a signed-in owner and MyCoWorker.
-- Apply after 20261101170000_assistant_nudges.sql.
-- These rows are not customer inbox messages. The inbox stays in public.messages.
-- A signed-in user can only read and write their own rows.
-- The app uses the anon key plus the user session. It does not use the service role.
-- Nothing is seeded. Demo mode keeps this chat on the device instead.

create table public.coworker_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint coworker_messages_role_check check (role in ('owner', 'assistant')),
  constraint coworker_messages_content_check check (
    char_length(btrim(content)) between 1 and 2000
  )
);

comment on table public.coworker_messages is
  'Messages between the signed-in owner and MyCoWorker. Not customer chats.';
comment on column public.coworker_messages.role is
  'owner is the business owner. assistant is MyCoWorker.';

create index coworker_messages_user_created_idx
  on public.coworker_messages (user_id, created_at);

alter table public.coworker_messages enable row level security;

create policy coworker_messages_select_own
on public.coworker_messages
for select
to authenticated
using (user_id = (select auth.uid()));

create policy coworker_messages_insert_own
on public.coworker_messages
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy coworker_messages_delete_own
on public.coworker_messages
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.coworker_messages from anon;

grant select, insert, delete on table public.coworker_messages to authenticated;
grant select, insert, update, delete on table public.coworker_messages to service_role;
