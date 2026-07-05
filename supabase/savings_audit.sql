-- ============================================================================
-- Savings audit for devkane2343@gmail.com
-- ============================================================================
-- Run this in the Supabase SQL Editor (it runs privileged, so it can see the
-- user's rows — unlike the app's anon key which is blocked by RLS).
--
-- It answers: what are my EXACT Emergency Fund, General Savings, and MP2
-- totals right now — kept as three separate buckets, plus a combined savings
-- total. It reads BOTH sources the app uses:
--   * income_history columns  (emergency_fund, general_savings)
--   * expenses rows           (category = 'Emergency Fund' / 'General Savings'
--                              / 'Savings' / 'Pag-IBIG MP2')
--
-- Read-only. Safe to run any time, before or after the other migrations.
-- Run mp2_savings_migration.sql first if you want MP2 expense rows already
-- re-tagged; otherwise query D below shows the un-tagged MP2 candidates too.
-- ============================================================================

-- Resolve the user once. (Everything below filters to this id.)
-- If you prefer, replace the subquery with the literal uuid.

-- ----------------------------------------------------------------------------
-- A) THE ANSWER — three separated buckets + combined total, exact to the cent.
-- ----------------------------------------------------------------------------
with uid as (
  select id from auth.users where lower(email) = lower('devkane2343@gmail.com')
),
ef as (  -- Emergency Fund: income column + expense rows
  select
    (select coalesce(sum(emergency_fund),0) from income_history where user_id = (select id from uid))
  + (select coalesce(sum(amount),0)         from expenses       where user_id = (select id from uid) and category = 'Emergency Fund')
      as total
),
gs as (  -- General Savings: income column + expense rows
  select
    (select coalesce(sum(general_savings),0) from income_history where user_id = (select id from uid))
  + (select coalesce(sum(amount),0)          from expenses       where user_id = (select id from uid) and category = 'General Savings')
      as total
),
mp2 as ( -- Pag-IBIG MP2: expense rows only (already re-tagged, OR matched by description if not yet)
  select
    coalesce(sum(amount),0) as total
  from expenses
  where user_id = (select id from uid)
    and (
      category = 'Pag-IBIG MP2'
      or (
        category not in ('Emergency Fund','General Savings','Savings')
        and (
             description ilike '%mp2%'
          or description ilike '%mp-2%'
          or description ilike '%modified pag%'
          or description ilike '%pagibig mp%'
          or description ilike '%pag-ibig mp%'
        )
      )
    )
),
plain_savings as ( -- the generic 'Savings' category, if you used it
  select coalesce(sum(amount),0) as total
  from expenses
  where user_id = (select id from uid) and category = 'Savings'
)
select
  (select total from ef)                                         as emergency_fund,
  (select total from gs)                                         as general_savings,
  (select total from mp2)                                        as pagibig_mp2,
  (select total from plain_savings)                             as other_savings,
  (select total from ef) + (select total from gs)
    + (select total from mp2) + (select total from plain_savings) as total_savings;

-- ----------------------------------------------------------------------------
-- B) Source breakdown — see how much of EF / General came from income vs expenses.
--    Useful to sanity-check the numbers in A.
-- ----------------------------------------------------------------------------
with uid as (
  select id from auth.users where lower(email) = lower('devkane2343@gmail.com')
)
select
  'income_history columns' as source,
  (select coalesce(sum(emergency_fund),0)  from income_history where user_id = (select id from uid)) as emergency_fund,
  (select coalesce(sum(general_savings),0) from income_history where user_id = (select id from uid)) as general_savings,
  0::numeric as pagibig_mp2
union all
select
  'expenses rows',
  (select coalesce(sum(amount),0) from expenses where user_id = (select id from uid) and category = 'Emergency Fund'),
  (select coalesce(sum(amount),0) from expenses where user_id = (select id from uid) and category = 'General Savings'),
  (select coalesce(sum(amount),0) from expenses where user_id = (select id from uid) and category = 'Pag-IBIG MP2');

-- ----------------------------------------------------------------------------
-- C) Every expense category this user has, with count + sum.
--    This reveals where MP2 is actually hiding if the description match missed it.
-- ----------------------------------------------------------------------------
select e.category, count(*) as rows, sum(e.amount) as total
from expenses e
join auth.users u on u.id = e.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
group by e.category
order by total desc;

-- ----------------------------------------------------------------------------
-- D) MP2 CANDIDATES — the individual rows the description heuristic would catch
--    that are NOT yet tagged as a savings category. Eyeball these before
--    running mp2_savings_migration.sql so you know exactly what will be re-tagged.
-- ----------------------------------------------------------------------------
select e.date, e.category, e.amount, e.description
from expenses e
join auth.users u on u.id = e.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and e.category not in ('Pag-IBIG MP2','Emergency Fund','General Savings','Savings')
  and (
       e.description ilike '%mp2%'
    or e.description ilike '%mp-2%'
    or e.description ilike '%modified pag%'
    or e.description ilike '%pagibig mp%'
    or e.description ilike '%pag-ibig mp%'
  )
order by e.date desc;
