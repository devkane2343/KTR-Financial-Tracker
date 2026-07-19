-- ============================================================================
-- Investment / VUL accounts — market-value tracking on custom savings cards
-- ============================================================================
-- Lets a custom savings card be flagged as an INVESTMENT / insurance (VUL, e.g.
-- Prulife). An investment card tracks two figures instead of one:
--   • balance            → the CURRENT FUND VALUE (what it's worth now, changes
--                          with the market). This is what counts toward net worth
--                          (unchanged: net worth already sums `balance`).
--   • contributed_value  → the total you've PAID IN (your cost basis).
-- Growth = balance − contributed_value (shown as ₱ and %). It can be negative
-- (an investment can lose value); growth is computed, never stored, so no CHECK
-- needs to allow negatives — both stored figures stay >= 0.
--
-- Every time the fund value is updated, the app appends a dated snapshot to
-- investment_value_history so the card can show a growth sparkline + log.
--
-- Two parts:
--   1) ALTER custom_savings_accounts — add account_type, contributed_value, provider.
--   2) CREATE investment_value_history — dated fund-value snapshots per card.
--
-- Additive + nullable/defaulted, so existing cards become account_type='savings'
-- and behave exactly as before. Run in Supabase SQL Editor AFTER
-- custom_savings_accounts_migration.sql. Safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) New columns on custom_savings_accounts
-- ----------------------------------------------------------------------------
alter table public.custom_savings_accounts
  add column if not exists account_type text not null default 'savings';

-- Constrain account_type to the known kinds. Drop-then-add so re-running with a
-- widened set later is safe (matches the app's idempotent-migration discipline).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'custom_savings_accounts_account_type_check'
  ) then
    alter table public.custom_savings_accounts
      drop constraint custom_savings_accounts_account_type_check;
  end if;
end $$;

alter table public.custom_savings_accounts
  add constraint custom_savings_accounts_account_type_check
  check (account_type in ('savings', 'investment'));

alter table public.custom_savings_accounts
  add column if not exists contributed_value numeric(12,2) not null default 0
    check (contributed_value >= 0);

-- Free-text provider label for investment cards (e.g. 'Prulife', 'Sun Life').
alter table public.custom_savings_accounts
  add column if not exists provider text;

-- Which months have been PAID, per year, for a recurring (e.g. monthly) premium.
-- JSONB object keyed by year → array of month numbers 1..12, e.g.
--   { "2026": [1, 2, 3] }  means Jan/Feb/Mar 2026 are paid.
-- Defaults to an empty object so existing rows are valid immediately.
alter table public.custom_savings_accounts
  add column if not exists paid_months jsonb not null default '{}'::jsonb;

create index if not exists idx_custom_savings_accounts_account_type
  on public.custom_savings_accounts(account_type);

-- ----------------------------------------------------------------------------
-- 2) investment_value_history — one dated snapshot per fund-value update
-- ----------------------------------------------------------------------------
create table if not exists public.investment_value_history (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  account_id        uuid not null references public.custom_savings_accounts(id) on delete cascade,
  as_of             date not null default current_date,
  fund_value        numeric(12,2) not null default 0 check (fund_value >= 0),
  contributed_value numeric(12,2) not null default 0 check (contributed_value >= 0),
  created_at        timestamptz not null default now()
);

-- One snapshot PER DAY per account. Editing the fund value again the same day
-- overwrites that day's row (via upsert on this key) rather than piling up
-- multiple same-date points that would render as a fake growth line.
create unique index if not exists uq_investment_value_history_account_day
  on public.investment_value_history(account_id, as_of);

create index if not exists idx_investment_value_history_account
  on public.investment_value_history(account_id, as_of desc);
create index if not exists idx_investment_value_history_user
  on public.investment_value_history(user_id);

alter table public.investment_value_history enable row level security;

drop policy if exists "Users can manage own investment history" on public.investment_value_history;
create policy "Users can manage own investment history" on public.investment_value_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
