-- WhatsApp Cloud API connection for a signed-in business.
-- Apply after 20261031120000_business_tables.sql.
-- Inbound messages are written by mcw_ingest_whatsapp. That function checks
-- WEBHOOK_VERIFY_TOKEN (sha256) before it inserts, so the public anon key
-- cannot forge chats. The service role is not required.
-- Access tokens and the verify-token hash are not selectable by the signed-in user.

create extension if not exists pgcrypto with schema extensions;

create table public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_number_id text not null,
  display_phone_number text,
  waba_id text,
  business_name text,
  access_token text,
  token_source text not null,
  ingest_token_hash text,
  auto_reply boolean not null default false,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_connections_user_id_key unique (user_id),
  constraint whatsapp_connections_phone_number_id_key unique (phone_number_id),
  constraint whatsapp_connections_phone_number_id_check check (
    phone_number_id ~ '^[0-9]{6,32}$'
  ),
  constraint whatsapp_connections_display_phone_check check (
    display_phone_number is null or char_length(display_phone_number) between 1 and 40
  ),
  constraint whatsapp_connections_waba_check check (
    waba_id is null or waba_id ~ '^[0-9]{6,32}$'
  ),
  constraint whatsapp_connections_business_name_check check (
    business_name is null or char_length(btrim(business_name)) between 1 and 120
  ),
  constraint whatsapp_connections_token_source_check check (
    token_source in ('pasted', 'oauth', 'env')
  ),
  constraint whatsapp_connections_token_check check (
    (
      token_source = 'env'
      and access_token is null
    )
    or (
      token_source in ('pasted', 'oauth')
      and access_token is not null
      and char_length(access_token) between 20 and 4096
    )
  ),
  constraint whatsapp_connections_hash_check check (
    ingest_token_hash is null or ingest_token_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint whatsapp_connections_status_check check (
    status in ('connected', 'disconnected')
  )
);

comment on table public.whatsapp_connections is
  'The WhatsApp number a signed-in business has linked. One number per account.';
comment on column public.whatsapp_connections.access_token is
  'Cloud API token for pasted or OAuth connections. Null when the server env token is used.';
comment on column public.whatsapp_connections.ingest_token_hash is
  'sha256 hex of WEBHOOK_VERIFY_TOKEN. The webhook function requires this match.';
comment on column public.whatsapp_connections.auto_reply is
  'When false, MyCoWorker waits for the owner to send. When true, a short acknowledgement can go out.';

create table public.whatsapp_receipts (
  wa_message_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint whatsapp_receipts_id_check check (char_length(wa_message_id) between 1 and 255)
);

comment on table public.whatsapp_receipts is
  'WhatsApp message ids already saved, so a retried webhook does not duplicate a chat.';

create index customers_user_channel_phone_idx
  on public.customers (user_id, channel, phone);

create index whatsapp_receipts_user_id_idx
  on public.whatsapp_receipts (user_id);

create trigger whatsapp_connections_set_updated_at
before update on public.whatsapp_connections
for each row
execute function public.mcw_set_updated_at();

alter table public.whatsapp_connections enable row level security;
alter table public.whatsapp_receipts enable row level security;

create policy whatsapp_connections_select_own
on public.whatsapp_connections
for select
to authenticated
using (user_id = (select auth.uid()));

create policy whatsapp_connections_insert_own
on public.whatsapp_connections
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy whatsapp_connections_update_own
on public.whatsapp_connections
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy whatsapp_connections_delete_own
on public.whatsapp_connections
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.whatsapp_connections from anon, public;
revoke all on table public.whatsapp_receipts from anon, authenticated, public;

grant select (
  id,
  user_id,
  phone_number_id,
  display_phone_number,
  waba_id,
  business_name,
  token_source,
  auto_reply,
  status,
  created_at,
  updated_at
) on table public.whatsapp_connections to authenticated;

grant insert, update, delete on table public.whatsapp_connections to authenticated;
grant select, insert, update, delete on table public.whatsapp_connections to service_role;
grant select, insert, update, delete on table public.whatsapp_receipts to service_role;

create or replace function public.mcw_ingest_whatsapp(
  p_verify_token text,
  p_phone_number_id text,
  p_wa_message_id text,
  p_from_phone text,
  p_profile_name text,
  p_body text,
  p_hot boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_conn public.whatsapp_connections%rowtype;
  v_customer_id uuid;
  v_chat_id uuid;
  v_message_id uuid;
  v_name text;
  v_phone text;
  v_body text;
  v_status text;
begin
  if p_verify_token is null or char_length(p_verify_token) < 8 then
    return jsonb_build_object('stored', false, 'reason', 'unauthorized');
  end if;

  if p_phone_number_id is null
    or p_wa_message_id is null
    or p_from_phone is null
    or p_body is null
    or char_length(p_wa_message_id) > 255
  then
    return jsonb_build_object('stored', false, 'reason', 'invalid');
  end if;

  v_hash := encode(
    extensions.digest(convert_to(p_verify_token, 'utf8'), 'sha256'),
    'hex'
  );

  select *
    into v_conn
  from public.whatsapp_connections
  where phone_number_id = p_phone_number_id
    and status = 'connected'
  for update;

  if not found then
    return jsonb_build_object('stored', false, 'reason', 'no_connection');
  end if;

  if v_conn.ingest_token_hash is distinct from v_hash then
    return jsonb_build_object('stored', false, 'reason', 'unauthorized');
  end if;

  perform 1
  from public.whatsapp_receipts
  where wa_message_id = p_wa_message_id;

  if found then
    return jsonb_build_object(
      'stored', true,
      'duplicate', true,
      'auto_reply', false
    );
  end if;

  v_phone := left(regexp_replace(p_from_phone, '[^0-9]', '', 'g'), 39);
  if v_phone is null or char_length(v_phone) < 6 then
    return jsonb_build_object('stored', false, 'reason', 'invalid');
  end if;
  v_phone := '+' || v_phone;

  v_body := btrim(p_body);
  if char_length(v_body) < 1 then
    return jsonb_build_object('stored', false, 'reason', 'invalid');
  end if;
  if char_length(v_body) > 8000 then
    v_body := left(v_body, 8000);
  end if;

  v_name := left(
    btrim(coalesce(nullif(btrim(p_profile_name), ''), v_phone)),
    120
  );

  select id
    into v_customer_id
  from public.customers
  where user_id = v_conn.user_id
    and channel = 'whatsapp'
    and phone = v_phone
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers (user_id, name, channel, phone, ready_to_close)
    values (
      v_conn.user_id,
      v_name,
      'whatsapp',
      v_phone,
      coalesce(p_hot, false)
    )
    returning id into v_customer_id;
  elsif coalesce(p_hot, false) then
    update public.customers
    set ready_to_close = true,
        name = case
          when name = v_phone or name ~ '^\+[0-9]+$' then v_name
          else name
        end
    where id = v_customer_id;
  elsif exists (
    select 1
    from public.customers
    where id = v_customer_id
      and (name = v_phone or name ~ '^\+[0-9]+$')
  ) then
    update public.customers
    set name = v_name
    where id = v_customer_id;
  end if;

  select id
    into v_chat_id
  from public.chats
  where user_id = v_conn.user_id
    and customer_id = v_customer_id
    and channel = 'whatsapp'
  order by created_at asc
  limit 1;

  v_status := case when coalesce(p_hot, false) then 'hot' else 'your_turn' end;

  if v_chat_id is null then
    insert into public.chats (user_id, customer_id, channel, status)
    values (v_conn.user_id, v_customer_id, 'whatsapp', v_status)
    returning id into v_chat_id;
  else
    update public.chats
    set status = case
      when status = 'hot' or v_status = 'hot' then 'hot'
      else 'your_turn'
    end
    where id = v_chat_id;
  end if;

  insert into public.messages (chat_id, role, content)
  values (v_chat_id, 'user', v_body)
  returning id into v_message_id;

  insert into public.whatsapp_receipts (wa_message_id, user_id, message_id)
  values (p_wa_message_id, v_conn.user_id, v_message_id);

  return jsonb_build_object(
    'stored', true,
    'duplicate', false,
    'chat_id', v_chat_id,
    'customer_phone', regexp_replace(v_phone, '\D', '', 'g'),
    'auto_reply', v_conn.auto_reply,
    'hot', coalesce(p_hot, false),
    'access_token', case
      when v_conn.auto_reply then v_conn.access_token
      else null
    end,
    'token_source', v_conn.token_source,
    'phone_number_id', v_conn.phone_number_id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'stored', true,
      'duplicate', true,
      'auto_reply', false
    );
end;
$$;

comment on function public.mcw_ingest_whatsapp(text, text, text, text, text, text, boolean) is
  'Save one inbound WhatsApp message for the business that connected that phone number id.';

create or replace function public.mcw_record_whatsapp_outbound(
  p_verify_token text,
  p_chat_id uuid,
  p_content text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_owner uuid;
  v_body text;
  v_status text;
begin
  if p_verify_token is null or char_length(p_verify_token) < 8 then
    return jsonb_build_object('stored', false, 'reason', 'unauthorized');
  end if;

  v_body := btrim(coalesce(p_content, ''));
  if char_length(v_body) < 1 or char_length(v_body) > 8000 then
    return jsonb_build_object('stored', false, 'reason', 'invalid');
  end if;

  if p_status not in ('answered', 'followed_up', 'hot', 'your_turn') then
    return jsonb_build_object('stored', false, 'reason', 'invalid');
  end if;

  v_hash := encode(
    extensions.digest(convert_to(p_verify_token, 'utf8'), 'sha256'),
    'hex'
  );

  select chats.user_id
    into v_owner
  from public.chats
  join public.whatsapp_connections as connections
    on connections.user_id = chats.user_id
   and connections.status = 'connected'
   and connections.ingest_token_hash = v_hash
  where chats.id = p_chat_id
    and chats.channel = 'whatsapp';

  if v_owner is null then
    return jsonb_build_object('stored', false, 'reason', 'no_connection');
  end if;

  insert into public.messages (chat_id, role, content)
  values (p_chat_id, 'assistant', v_body);

  select status
    into v_status
  from public.chats
  where id = p_chat_id;

  update public.chats
  set status = case
    when v_status = 'hot' then 'hot'
    else p_status
  end
  where id = p_chat_id;

  return jsonb_build_object('stored', true);
end;
$$;

comment on function public.mcw_record_whatsapp_outbound(text, uuid, text, text) is
  'Save the short WhatsApp acknowledgement MyCoWorker sent for a connected business.';

create or replace function public.mcw_whatsapp_reply_context(p_chat_id uuid)
returns table (
  phone_number_id text,
  access_token text,
  token_source text,
  customer_phone text,
  auto_reply boolean,
  chat_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    connections.phone_number_id,
    connections.access_token,
    connections.token_source,
    customers.phone,
    connections.auto_reply,
    chats.status
  from public.chats
  join public.customers on customers.id = chats.customer_id
  join public.whatsapp_connections as connections
    on connections.user_id = chats.user_id
   and connections.status = 'connected'
  where chats.id = p_chat_id
    and chats.user_id = (select auth.uid())
    and chats.channel = 'whatsapp';
$$;

comment on function public.mcw_whatsapp_reply_context(uuid) is
  'Phone number and token the signed-in owner needs to reply on WhatsApp.';

revoke all on function public.mcw_ingest_whatsapp(text, text, text, text, text, text, boolean) from public;
revoke all on function public.mcw_record_whatsapp_outbound(text, uuid, text, text) from public;
revoke all on function public.mcw_whatsapp_reply_context(uuid) from public;

grant execute on function public.mcw_ingest_whatsapp(text, text, text, text, text, text, boolean) to anon, authenticated, service_role;
grant execute on function public.mcw_record_whatsapp_outbound(text, uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.mcw_whatsapp_reply_context(uuid) to authenticated, service_role;
