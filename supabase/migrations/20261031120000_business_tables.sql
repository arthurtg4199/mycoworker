-- MyCoWorker business tables.
-- Apply once in the Supabase SQL editor, or with the Supabase CLI (`supabase db push`).
-- A signed-in user can only read and write rows they own. Nothing is seeded:
-- a new account starts with an empty inbox.
-- The app uses the anon key plus the user session. It does not use the service role.

create or replace function public.mcw_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.mcw_require_customer_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner uuid;
begin
  select customers.user_id
    into owner
  from public.customers
  where customers.id = new.customer_id;

  if owner is null or owner is distinct from new.user_id then
    raise exception 'customer_id must belong to the same user'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.mcw_touch_chat_on_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.chats
  set last_message_at = new.created_at
  where chats.id = new.chat_id
    and (chats.last_message_at is null or chats.last_message_at < new.created_at);

  return new;
end;
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  channel text not null,
  phone text,
  email text,
  mood text,
  happiness smallint,
  ready_to_close boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint customers_channel_check check (channel in ('whatsapp', 'instagram', 'email')),
  constraint customers_phone_check check (phone is null or char_length(phone) between 1 and 40),
  constraint customers_email_check check (email is null or char_length(email) between 3 and 320),
  constraint customers_mood_check check (mood is null or char_length(btrim(mood)) between 1 and 40),
  constraint customers_happiness_check check (happiness is null or happiness between 0 and 100),
  constraint customers_notes_check check (notes is null or char_length(notes) <= 4000)
);

comment on table public.customers is
  'People a signed-in business talks to.';
comment on column public.customers.mood is
  'Short feeling label, such as happy, unsure, or frustrated.';
comment on column public.customers.happiness is
  'Optional 0-100 score. Higher means happier.';

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  channel text not null,
  status text not null default 'open',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chats_channel_check check (channel in ('whatsapp', 'instagram', 'email')),
  constraint chats_status_check check (
    status in ('open', 'answered', 'hot', 'followed_up', 'your_turn', 'closed')
  )
);

comment on table public.chats is
  'Conversations between a business and a customer.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint messages_role_check check (role in ('user', 'assistant', 'owner')),
  constraint messages_content_check check (char_length(btrim(content)) between 1 and 8000)
);

comment on table public.messages is
  'Messages inside a chat. user is the customer, assistant is MyCoWorker, owner is the business.';
comment on column public.messages.role is
  'user is the customer, assistant is MyCoWorker, owner is the signed-in business.';

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_title_check check (char_length(btrim(title)) between 1 and 160),
  constraint appointments_status_check check (
    status in ('scheduled', 'completed', 'cancelled')
  )
);

comment on table public.appointments is
  'Times a business plans to meet a customer.';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_check check (amount >= 0),
  constraint payments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payments_status_check check (
    status in ('pending', 'confirmed', 'failed', 'refunded')
  )
);

comment on table public.payments is
  'Money a business has recorded for a customer. Recording a row does not charge anyone.';

create index customers_user_id_idx on public.customers (user_id);
create index customers_user_ready_idx on public.customers (user_id) where ready_to_close;
create index chats_user_id_idx on public.chats (user_id);
create index chats_user_last_message_idx
  on public.chats (user_id, last_message_at desc nulls last);
create index chats_customer_id_idx on public.chats (customer_id);
create index messages_chat_id_created_at_idx
  on public.messages (chat_id, created_at desc);
create index appointments_user_scheduled_idx
  on public.appointments (user_id, scheduled_at);
create index appointments_customer_id_idx on public.appointments (customer_id);
create index payments_user_created_idx
  on public.payments (user_id, created_at desc);
create index payments_customer_id_idx on public.payments (customer_id);

create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.mcw_set_updated_at();

create trigger chats_set_updated_at
before update on public.chats
for each row
execute function public.mcw_set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.mcw_set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.mcw_set_updated_at();

create trigger chats_require_customer_owner
before insert or update of customer_id, user_id on public.chats
for each row
execute function public.mcw_require_customer_owner();

create trigger appointments_require_customer_owner
before insert or update of customer_id, user_id on public.appointments
for each row
execute function public.mcw_require_customer_owner();

create trigger payments_require_customer_owner
before insert or update of customer_id, user_id on public.payments
for each row
execute function public.mcw_require_customer_owner();

create trigger messages_touch_chat
after insert on public.messages
for each row
execute function public.mcw_touch_chat_on_message();

alter table public.customers enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;

create policy customers_select_own
on public.customers
for select
to authenticated
using (user_id = (select auth.uid()));

create policy customers_insert_own
on public.customers
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy customers_update_own
on public.customers
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy customers_delete_own
on public.customers
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy chats_select_own
on public.chats
for select
to authenticated
using (user_id = (select auth.uid()));

create policy chats_insert_own
on public.chats
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy chats_update_own
on public.chats
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy chats_delete_own
on public.chats
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy messages_select_own
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chats
    where chats.id = messages.chat_id
      and chats.user_id = (select auth.uid())
  )
);

create policy messages_insert_own
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chats
    where chats.id = chat_id
      and chats.user_id = (select auth.uid())
  )
);

create policy messages_update_own
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.chats
    where chats.id = messages.chat_id
      and chats.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.chats
    where chats.id = chat_id
      and chats.user_id = (select auth.uid())
  )
);

create policy messages_delete_own
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.chats
    where chats.id = messages.chat_id
      and chats.user_id = (select auth.uid())
  )
);

create policy appointments_select_own
on public.appointments
for select
to authenticated
using (user_id = (select auth.uid()));

create policy appointments_insert_own
on public.appointments
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy appointments_update_own
on public.appointments
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy appointments_delete_own
on public.appointments
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy payments_select_own
on public.payments
for select
to authenticated
using (user_id = (select auth.uid()));

create policy payments_insert_own
on public.payments
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy payments_update_own
on public.payments
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy payments_delete_own
on public.payments
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Inbox read model. security_invoker keeps the underlying table policies in force
-- so this view cannot bypass row level security.
create view public.chat_previews
with (security_invoker = true, security_barrier = true) as
select
  chats.id,
  chats.user_id,
  chats.customer_id,
  chats.channel,
  chats.status,
  chats.last_message_at,
  chats.created_at,
  chats.updated_at,
  customers.name as customer_name,
  customers.ready_to_close,
  latest.content as last_message
from public.chats
join public.customers on customers.id = chats.customer_id
left join lateral (
  select messages.content
  from public.messages
  where messages.chat_id = chats.id
  order by messages.created_at desc
  limit 1
) as latest on true;

comment on view public.chat_previews is
  'One row per chat with the latest message. Checked with the caller''s permissions.';

revoke all on table public.customers from anon;
revoke all on table public.chats from anon;
revoke all on table public.messages from anon;
revoke all on table public.appointments from anon;
revoke all on table public.payments from anon;
revoke all on table public.chat_previews from anon;

grant select, insert, update, delete on table public.customers to authenticated, service_role;
grant select, insert, update, delete on table public.chats to authenticated, service_role;
grant select, insert, update, delete on table public.messages to authenticated, service_role;
grant select, insert, update, delete on table public.appointments to authenticated, service_role;
grant select, insert, update, delete on table public.payments to authenticated, service_role;
grant select on table public.chat_previews to authenticated, service_role;

revoke all on function public.mcw_set_updated_at() from public;
revoke all on function public.mcw_require_customer_owner() from public;
revoke all on function public.mcw_touch_chat_on_message() from public;

grant execute on function public.mcw_set_updated_at() to authenticated, service_role;
grant execute on function public.mcw_require_customer_owner() to authenticated, service_role;
grant execute on function public.mcw_touch_chat_on_message() to authenticated, service_role;
