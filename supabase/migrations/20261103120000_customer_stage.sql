-- Customer stage for the mini CRM.
-- Apply after 20261101190000_coworker_messages.sql.
-- Apply once in the Supabase SQL editor, or with the Supabase CLI (`supabase db push`).
-- The app does not run this file.
--
-- Adds customers.stage. Notes already live on customers.
-- Existing owner-only policies on customers stay in force: a signed-in user
-- can only read and write rows they own, including this new column.
-- Nothing is seeded. Existing rows become 'new'.
-- The app uses the anon key plus the user session. It does not use the service role.

alter table public.customers
  add column stage text not null default 'new';

alter table public.customers
  add constraint customers_stage_check
  check (stage in ('new', 'interested', 'paid', 'follow_up'));

comment on column public.customers.stage is
  'Where this customer sits for the owner: new, interested, paid, or follow_up.';

create index customers_user_stage_idx
  on public.customers (user_id, stage);
