-- ============================================================================
-- Net Worth: wallet_balance table + net_worth helper view
-- ============================================================================
-- Goal: track "money on my wallet" (cash on hand) as an ASSET, and surface a
--       Net Worth number = wallet cash + total savings. Today savings are
--       logged like an expense, so they feel "gone" — this makes them show up
--       as part of what you actually own.
--
-- What this does:
--   1) Creates wallet_balance (one editable cash-on-hand balance per user).
--   2) RLS so each user only sees/edits their own balance.
--   3) updated_at trigger.
--   4) Seeds a zero-balance row for devkane2343@gmail.com so the app has a row
--      to edit immediately.
--   5) Creates a net_worth view with the three savings buckets kept SEPARATE
--      as columns (emergency_fund, general_savings, pagibig_mp2) — all still
--      counted toward total_savings and net_worth. Each bucket sums its two
--      sources: income_history columns + matching expenses rows.
--
-- Run in Supabase SQL Editor AFTER mp2_savings_migration.sql. Safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) wallet_balance — current cash on hand. One row per user.
-- ----------------------------------------------------------------------------
create table if not exists public.wallet_balance (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  balance    numeric(12,2) not null default 0 check (balance >= 0),
  label      text not null default 'Wallet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallet_balance_user_id on public.wallet_balance(user_id);

-- ----------------------------------------------------------------------------
-- 2) updated_at trigger (reuse the shared function from schema.sql;
--    define it here too so this file is standalone-safe).
-- ----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_wallet_balance_updated_at on public.wallet_balance;
create trigger trigger_wallet_balance_updated_at
  before update on public.wallet_balance
  for each row
  execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3) Row Level Security — each user manages only their own wallet.
-- ----------------------------------------------------------------------------
alter table public.wallet_balance enable row level security;

drop policy if exists "Users can manage own wallet" on public.wallet_balance;
create policy "Users can manage own wallet" on public.wallet_balance
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4) Seed a zero row for devkane2343@gmail.com so the Net Worth tab has
--    something to edit right away. Update the balance from the app later.
-- ----------------------------------------------------------------------------
do $$
declare
  target_uid uuid;
begin
  select id into target_uid
  from auth.users
  where lower(email) = lower('devkane2343@gmail.com');

  if target_uid is null then
    raise notice 'User devkane2343@gmail.com not found — wallet row not seeded.';
    return;
  end if;

  insert into public.wallet_balance (user_id, balance, label)
  values (target_uid, 0, 'Wallet')
  on conflict (user_id) do nothing;

  raise notice 'Wallet row ready for %', target_uid;
end $$;

-- ----------------------------------------------------------------------------
-- 5) net_worth view — one row per user. The three savings buckets stay
--    SEPARATE (emergency_fund, general_savings, pagibig_mp2) but all roll up:
--
--       total_savings = emergency_fund + general_savings + pagibig_mp2 + other_savings
--       net_worth     = wallet_cash + total_savings
--
--    Each bucket sums its two sources — the income_history deduction columns
--    AND the matching expenses rows — so it matches savings_audit.sql exactly.
--    other_savings holds the generic 'Savings' category if you ever used it.
--
--    This mirrors the app's own definition of savings (see lib/utils.ts
--    isSavingsCategory + SummaryCards grossSavings). It does NOT subtract
--    "savings used to cover deficits" — that adjustment lives in the app; the
--    view gives the raw asset total. RLS on the base tables means a signed-in
--    user only ever sees their own numbers through this view.
-- ----------------------------------------------------------------------------
-- Drop first: CREATE OR REPLACE VIEW cannot rename/reorder existing columns,
-- so an earlier version of this view (with different column order) would make
-- it fail with "cannot change name of view column". Dropping side-steps that.
drop view if exists public.net_worth;

create view public.net_worth
with (security_invoker = true) as
with wallet as (
  select user_id, sum(balance) as wallet_cash
  from public.wallet_balance
  group by user_id
),
-- Emergency Fund = income column + expense rows
ef as (
  select user_id, sum(v) as emergency_fund from (
    select user_id, coalesce(emergency_fund, 0) as v from public.income_history
    union all
    select user_id, amount as v from public.expenses where category = 'Emergency Fund'
  ) s group by user_id
),
-- General Savings = income column + expense rows
gs as (
  select user_id, sum(v) as general_savings from (
    select user_id, coalesce(general_savings, 0) as v from public.income_history
    union all
    select user_id, amount as v from public.expenses where category = 'General Savings'
  ) s group by user_id
),
-- Pag-IBIG MP2 = expense rows tagged 'Pag-IBIG MP2'
mp2 as (
  select user_id, sum(amount) as pagibig_mp2
  from public.expenses
  where category = 'Pag-IBIG MP2'
  group by user_id
),
-- Generic 'Savings' category, kept distinct so buckets don't overlap
other_sav as (
  select user_id, sum(amount) as other_savings
  from public.expenses
  where category = 'Savings'
  group by user_id
),
users_seen as (
  select user_id from wallet
  union select user_id from ef
  union select user_id from gs
  union select user_id from mp2
  union select user_id from other_sav
)
select
  u.user_id,
  coalesce(w.wallet_cash, 0)      as wallet_cash,
  coalesce(ef.emergency_fund, 0)  as emergency_fund,
  coalesce(gs.general_savings, 0) as general_savings,
  coalesce(mp2.pagibig_mp2, 0)    as pagibig_mp2,
  coalesce(os.other_savings, 0)   as other_savings,
  coalesce(ef.emergency_fund, 0)
    + coalesce(gs.general_savings, 0)
    + coalesce(mp2.pagibig_mp2, 0)
    + coalesce(os.other_savings, 0) as total_savings,
  coalesce(w.wallet_cash, 0)
    + coalesce(ef.emergency_fund, 0)
    + coalesce(gs.general_savings, 0)
    + coalesce(mp2.pagibig_mp2, 0)
    + coalesce(os.other_savings, 0) as net_worth
from users_seen u
left join wallet    w   on w.user_id   = u.user_id
left join ef            on ef.user_id  = u.user_id
left join gs            on gs.user_id  = u.user_id
left join mp2           on mp2.user_id = u.user_id
left join other_sav os  on os.user_id  = u.user_id;

-- ----------------------------------------------------------------------------
-- 6) Verify — net worth breakdown for devkane2343@gmail.com.
-- ----------------------------------------------------------------------------
select nw.wallet_cash,
       nw.emergency_fund, nw.general_savings, nw.pagibig_mp2, nw.other_savings,
       nw.total_savings, nw.net_worth
from public.net_worth nw
join auth.users u on u.id = nw.user_id
where lower(u.email) = lower('devkane2343@gmail.com');

-- ============================================================================
-- FRONTEND FOLLOW-UP (to actually show a Net Worth tab)
-- ============================================================================
-- Data access from the app (RLS scopes everything to the signed-in user):
--
--   // read your wallet
--   const { data } = await supabase
--     .from('wallet_balance').select('balance,label').maybeSingle();
--
--   // set your wallet cash on hand
--   await supabase.from('wallet_balance')
--     .upsert({ user_id: user.id, balance: newAmount }, { onConflict: 'user_id' });
--
--   // read the computed net worth (buckets kept separate)
--   const { data: nw } = await supabase
--     .from('net_worth')
--     .select('wallet_cash,emergency_fund,general_savings,pagibig_mp2,other_savings,total_savings,net_worth')
--     .maybeSingle();
--
-- Then add a 'networth' entry to TabType in types.ts and render a tab that
-- shows wallet_cash + the three separate savings buckets, summing to
-- total_savings, and wallet_cash + total_savings = net_worth. Because the
-- Pag-IBIG MP2 migration makes MP2 its own savings category, MP2 shows as its
-- own line here and also rolls into total_savings automatically.
-- ============================================================================
