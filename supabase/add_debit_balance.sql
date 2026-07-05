-- ============================================================================
-- Add a separate "Debit Card" balance to wallet_balance
-- ============================================================================
-- "Money on my wallet" (cash) and the Debit Card are two different pots. This
-- adds a debit_balance column alongside the existing cash `balance`, so both
-- are tracked independently and both roll into net worth.
--
-- Run in Supabase SQL Editor AFTER networth_wallet_migration.sql. Safe to re-run.
-- ============================================================================

alter table public.wallet_balance
  add column if not exists debit_balance numeric(12,2) not null default 0
    check (debit_balance >= 0);

-- ----------------------------------------------------------------------------
-- Fold Debit Card into the net_worth view (kept separate from wallet cash).
-- Drop-then-create because the column list changes.
-- ----------------------------------------------------------------------------
drop view if exists public.net_worth;

create view public.net_worth
with (security_invoker = true) as
with wallet as (
  select user_id,
         sum(balance)       as wallet_cash,
         sum(debit_balance) as debit_card
  from public.wallet_balance
  group by user_id
),
ef as (
  select user_id, sum(v) as emergency_fund from (
    select user_id, coalesce(emergency_fund, 0) as v from public.income_history
    union all
    select user_id, amount as v from public.expenses where category = 'Emergency Fund'
  ) s group by user_id
),
gs as (
  select user_id, sum(v) as general_savings from (
    select user_id, coalesce(general_savings, 0) as v from public.income_history
    union all
    select user_id, amount as v from public.expenses where category = 'General Savings'
  ) s group by user_id
),
mp2 as (
  select user_id, sum(amount) as pagibig_mp2
  from public.expenses
  where category = 'Pag-IBIG MP2'
  group by user_id
),
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
  coalesce(w.debit_card, 0)       as debit_card,
  coalesce(ef.emergency_fund, 0)  as emergency_fund,
  coalesce(gs.general_savings, 0) as general_savings,
  coalesce(mp2.pagibig_mp2, 0)    as pagibig_mp2,
  coalesce(os.other_savings, 0)   as other_savings,
  coalesce(ef.emergency_fund, 0)
    + coalesce(gs.general_savings, 0)
    + coalesce(mp2.pagibig_mp2, 0)
    + coalesce(os.other_savings, 0) as total_savings,
  coalesce(w.wallet_cash, 0)
    + coalesce(w.debit_card, 0)
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

-- Verify
select nw.wallet_cash, nw.debit_card,
       nw.emergency_fund, nw.general_savings, nw.pagibig_mp2, nw.other_savings,
       nw.total_savings, nw.net_worth
from public.net_worth nw
join auth.users u on u.id = nw.user_id
where lower(u.email) = lower('devkane2343@gmail.com');
