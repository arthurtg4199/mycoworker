-- How MyCoWorker handles chats, and in-app nudges for the owner.
-- Apply after 20261031220000_business_profiles.sql.
-- A signed-in user can only read and write their own rows.
-- The app uses the anon key plus the user session. It does not use the service role.
-- Nothing is seeded. Ask me first is the default when no settings row exists.
-- This does not send WhatsApp, email, or push. It only stores the owner's choice and nudges.

create table public.assistant_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  handling_mode text not null default 'ask_first',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_settings_handling_mode_check check (
    handling_mode in ('ask_first', 'auto_reply', 'paused')
  )
);

comment on table public.assistant_settings is
  'How a signed-in owner wants MyCoWorker to handle customer chats.';
comment on column public.assistant_settings.handling_mode is
  'ask_first waits for the owner, auto_reply lets the coworker handle routine chats, paused stays quiet.';

create trigger assistant_settings_set_updated_at
before update on public.assistant_settings
for each row
execute function public.mcw_set_updated_at();

alter table public.assistant_settings enable row level security;

create policy assistant_settings_select_own
on public.assistant_settings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy assistant_settings_insert_own
on public.assistant_settings
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy assistant_settings_update_own
on public.assistant_settings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy assistant_settings_delete_own
on public.assistant_settings
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.assistant_settings from anon;

grant select, insert, update, delete on table public.assistant_settings to authenticated, service_role;

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  customer_id uuid references public.customers (id) on delete set null,
  chat_id uuid references public.chats (id) on delete set null,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint nudges_type_check check (
    type in ('hot_buyer', 'follow_up', 'daily_check_in', 'unanswered')
  ),
  constraint nudges_title_check check (char_length(btrim(title)) between 1 and 140),
  constraint nudges_body_check check (char_length(btrim(body)) between 1 and 800),
  constraint nudges_dedupe_key_check check (char_length(btrim(dedupe_key)) between 1 and 160),
  constraint nudges_user_dedupe_key unique (user_id, dedupe_key)
);

comment on table public.nudges is
  'In-app nudges for the signed-in owner. Not email, SMS, or push.';
comment on column public.nudges.type is
  'hot_buyer, follow_up, daily_check_in, or unanswered.';
comment on column public.nudges.dedupe_key is
  'Stops the same chat signal, or the same morning check-in, from being inserted twice.';
comment on column public.nudges.read_at is
  'When the owner marked the nudge read. Null means unread.';

create index nudges_user_created_idx
  on public.nudges (user_id, created_at desc);

create index nudges_user_unread_idx
  on public.nudges (user_id, created_at desc)
  where read_at is null;

create or replace function public.mcw_nudge_owner_refs()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner uuid;
begin
  if new.customer_id is not null then
    select customers.user_id
      into owner
    from public.customers
    where customers.id = new.customer_id;

    if owner is null or owner is distinct from new.user_id then
      raise exception 'customer_id must belong to the same user'
        using errcode = '42501';
    end if;
  end if;

  if new.chat_id is not null then
    select chats.user_id
      into owner
    from public.chats
    where chats.id = new.chat_id;

    if owner is null or owner is distinct from new.user_id then
      raise exception 'chat_id must belong to the same user'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger nudges_owner_refs
before insert or update on public.nudges
for each row
execute function public.mcw_nudge_owner_refs();

alter table public.nudges enable row level security;

create policy nudges_select_own
on public.nudges
for select
to authenticated
using (user_id = (select auth.uid()));

create policy nudges_insert_own
on public.nudges
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy nudges_update_own
on public.nudges
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy nudges_delete_own
on public.nudges
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.nudges from anon;

grant select, insert, delete on table public.nudges to authenticated;
grant update (title, body, read_at) on table public.nudges to authenticated;
grant select, insert, update, delete on table public.nudges to service_role;
