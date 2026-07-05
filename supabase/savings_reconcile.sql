-- ============================================================================
-- Reconcile ALL 3 savings buckets for devkane2343@gmail.com
-- ============================================================================
-- Answers: "does my EF / GS / MP2 total actually add up, and from what rows?"
-- Run in Supabase SQL Editor (privileged — sees the data the app's anon key can't).
-- Read-only. Nothing is changed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) HEADLINE — each bucket split by source (paycheck deductions vs expense rows).
--    This is exactly what the app's cards sum. If a bucket looks wrong, the
--    next queries show the individual rows behind it.
-- ----------------------------------------------------------------------------
with uid as (
  select id from auth.users where lower(email) = lower('devkane2343@gmail.com')
)
select
  'Emergency Fund' as bucket,
  (select coalesce(sum(emergency_fund),0)  from income_history where user_id=(select id from uid)) as from_paychecks,
  (select coalesce(sum(amount),0)          from expenses where user_id=(select id from uid) and category='Emergency Fund') as from_expenses,
  (select coalesce(sum(emergency_fund),0)  from income_history where user_id=(select id from uid))
  + (select coalesce(sum(amount),0)        from expenses where user_id=(select id from uid) and category='Emergency Fund') as bucket_total
union all
select
  'General Savings',
  (select coalesce(sum(general_savings),0) from income_history where user_id=(select id from uid)),
  (select coalesce(sum(amount),0)          from expenses where user_id=(select id from uid) and category='General Savings'),
  (select coalesce(sum(general_savings),0) from income_history where user_id=(select id from uid))
  + (select coalesce(sum(amount),0)        from expenses where user_id=(select id from uid) and category='General Savings')
union all
select
  'Pag-IBIG MP2',
  0,
  (select coalesce(sum(amount),0)          from expenses where user_id=(select id from uid) and category='Pag-IBIG MP2'),
  (select coalesce(sum(amount),0)          from expenses where user_id=(select id from uid) and category='Pag-IBIG MP2')
union all
select
  'Other (Savings)',
  0,
  (select coalesce(sum(amount),0)          from expenses where user_id=(select id from uid) and category='Savings'),
  (select coalesce(sum(amount),0)          from expenses where user_id=(select id from uid) and category='Savings');

-- ----------------------------------------------------------------------------
-- 2) Every EF contribution, itemized (paycheck deductions + expense rows).
--    Eyeball this: does it add up to what the EF card shows? Is anything here
--    that shouldn't be (e.g. an MP2 row mis-tagged as Emergency Fund)?
-- ----------------------------------------------------------------------------
with uid as (select id from auth.users where lower(email)=lower('devkane2343@gmail.com'))
select date, 'paycheck deduction' as source, emergency_fund as amount, 'from salary' as note
from income_history where user_id=(select id from uid) and coalesce(emergency_fund,0) > 0
union all
select date, 'expense row', amount, description
from expenses where user_id=(select id from uid) and category='Emergency Fund'
order by date desc;

-- ----------------------------------------------------------------------------
-- 3) Every General Savings contribution, itemized.
-- ----------------------------------------------------------------------------
with uid as (select id from auth.users where lower(email)=lower('devkane2343@gmail.com'))
select date, 'paycheck deduction' as source, general_savings as amount, 'from salary' as note
from income_history where user_id=(select id from uid) and coalesce(general_savings,0) > 0
union all
select date, 'expense row', amount, description
from expenses where user_id=(select id from uid) and category='General Savings'
order by date desc;

-- ----------------------------------------------------------------------------
-- 4) Every MP2 contribution, itemized.
-- ----------------------------------------------------------------------------
with uid as (select id from auth.users where lower(email)=lower('devkane2343@gmail.com'))
select date, amount, description
from expenses where user_id=(select id from uid) and category='Pag-IBIG MP2'
order by date desc;

-- ----------------------------------------------------------------------------
-- 5) SAFETY CHECK — is the July 5 "Pagibig MP2" ₱50,014 row double-living in two
--    categories? It should appear ONLY under 'Pag-IBIG MP2'. If it also shows as
--    'Emergency Fund' or 'Savings', that's the inflation you suspected.
-- ----------------------------------------------------------------------------
with uid as (select id from auth.users where lower(email)=lower('devkane2343@gmail.com'))
select date, category, amount, description
from expenses
where user_id=(select id from uid)
  and (description ilike '%mp2%' or description ilike '%pag%ibig%' or amount = 50014.00)
order by date desc;
