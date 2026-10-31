-- Business profile for a signed-in owner.
-- Apply after 20261031150000_whatsapp_connections.sql.
-- One row per user. A signed-in user can only read and write their own row.
-- The app uses the anon key plus the user session. It does not use the service role.
-- Nothing is seeded: a new account starts with no shop details.

create table public.business_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  business_name text not null,
  what_they_sell text,
  hours text,
  location text,
  reply_tone text,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_business_name_check check (
    char_length(btrim(business_name)) between 1 and 120
  ),
  constraint business_profiles_what_they_sell_check check (
    what_they_sell is null
    or char_length(btrim(what_they_sell)) between 1 and 500
  ),
  constraint business_profiles_hours_check check (
    hours is null or char_length(btrim(hours)) between 1 and 240
  ),
  constraint business_profiles_location_check check (
    location is null or char_length(btrim(location)) between 1 and 120
  ),
  constraint business_profiles_reply_tone_check check (
    reply_tone is null
    or reply_tone in ('friendly', 'warm', 'professional', 'brief', 'playful')
  ),
  constraint business_profiles_currency_check check (
    currency is null or currency ~ '^[A-Z]{3}$'
  )
);

comment on table public.business_profiles is
  'How a signed-in business describes itself. MyCoWorker uses this when it talks.';
comment on column public.business_profiles.business_name is
  'The shop name the owner wants customers to hear.';
comment on column public.business_profiles.what_they_sell is
  'A short description of the products or services.';
comment on column public.business_profiles.hours is
  'Opening hours in the owner''s own words.';
comment on column public.business_profiles.location is
  'City or area, such as Lagos.';
comment on column public.business_profiles.reply_tone is
  'How replies should sound: friendly, warm, professional, brief, or playful.';
comment on column public.business_profiles.currency is
  'Optional 3-letter code, such as NGN. Empty means the shop has not chosen one.';

create trigger business_profiles_set_updated_at
before update on public.business_profiles
for each row
execute function public.mcw_set_updated_at();

alter table public.business_profiles enable row level security;

create policy business_profiles_select_own
on public.business_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy business_profiles_insert_own
on public.business_profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy business_profiles_update_own
on public.business_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy business_profiles_delete_own
on public.business_profiles
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.business_profiles from anon;

grant select, insert, update, delete on table public.business_profiles to authenticated, service_role;
