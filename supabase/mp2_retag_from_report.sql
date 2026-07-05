-- ============================================================================
-- Re-tag the exact Pag-IBIG MP2 rows for devkane2343@gmail.com
-- ============================================================================
-- Source of truth: KTR Financial Report 2026-07-05. Three expense rows are MP2
-- but sit under the wrong category:
--
--   2026-07-05  Savings  "Pagibig MP2"   PHP 50,014.00
--   2026-03-04  Bills    "Pagibig MP2"   PHP  2,700.00
--   2026-03-02  Bills    "Pag Ibig MP2"  PHP    500.00
--                                        ------------
--                                total   PHP 53,214.00
--
-- This does NOT insert new rows — the data already exists. It re-tags those
-- three rows to category 'Pag-IBIG MP2' so MP2 is one clean savings bucket and
-- the 2,700 + 500 stop inflating the Bills expense total.
--
-- Prerequisite: 'Pag-IBIG MP2' must be an allowed category. This file adds it
-- to the CHECK constraint itself (step 1) so it is self-contained — you do NOT
-- need to run mp2_savings_migration.sql first, though running it is harmless.
--
-- Run in Supabase SQL Editor. Idempotent — safe to run multiple times.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Allow 'Pag-IBIG MP2' in the expenses.category CHECK constraint.
--    Drop whatever category check exists (name varies), recreate with MP2.
-- ----------------------------------------------------------------------------
do $$
declare
  cname text;
begin
  select c.conname into cname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'expenses'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%category%';

  if cname is not null then
    execute format('alter table public.expenses drop constraint %I', cname);
  end if;
end $$;

alter table public.expenses
  add constraint expenses_category_check
  check (category in (
    'Emergency Fund', 'General Savings', 'Life Insurance',
    'Food', 'Transportation', 'Utilities', 'Entertainment',
    'Bills', 'Shopping', 'Health', 'Savings', 'Pag-IBIG MP2', 'Others'
  ));

-- ----------------------------------------------------------------------------
-- 2) Re-tag the three MP2 rows to 'Pag-IBIG MP2', scoped to this user.
--    Matched precisely by (date, amount, description) from the report, so we
--    touch ONLY these rows and nothing else. Already-tagged rows are skipped,
--    which is what makes re-running safe.
-- ----------------------------------------------------------------------------
do $$
declare
  target_uid uuid;
  affected   integer;
begin
  select id into target_uid
  from auth.users
  where lower(email) = lower('devkane2343@gmail.com');

  if target_uid is null then
    raise notice 'User devkane2343@gmail.com not found — nothing re-tagged.';
    return;
  end if;

  update public.expenses
  set category = 'Pag-IBIG MP2'
  where user_id = target_uid
    and category <> 'Pag-IBIG MP2'
    and (
         (date = date '2026-07-05' and amount = 50014.00 and description ilike '%mp2%')
      or (date = date '2026-03-04' and amount =  2700.00 and description ilike '%mp2%')
      or (date = date '2026-03-02' and amount =   500.00 and description ilike '%mp%')
    );

  get diagnostics affected = row_count;
  raise notice 'Re-tagged % MP2 row(s) for % (expected up to 3).', affected, target_uid;
end $$;

commit;

-- ----------------------------------------------------------------------------
-- 3) Verify — the MP2 rows and their total (expect 3 rows, PHP 53,214.00).
-- ----------------------------------------------------------------------------
select e.date, e.category, e.amount, e.description
from public.expenses e
join auth.users u on u.id = e.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and e.category = 'Pag-IBIG MP2'
order by e.date desc;

select count(*) as mp2_rows, coalesce(sum(e.amount), 0) as mp2_total
from public.expenses e
join auth.users u on u.id = e.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and e.category = 'Pag-IBIG MP2';
