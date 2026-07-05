-- ============================================================================
-- Pag-IBIG MP2 → Savings migration
-- ============================================================================
-- Goal: any expense that is a Pag-IBIG MP2 contribution should be treated as
--       SAVINGS, not a spent expense, so it stops looking like money gone.
--
-- What this does:
--   1) Adds a new 'Pag-IBIG MP2' category to the expenses CHECK constraint.
--   2) Re-tags existing MP2 expense rows (matched by description) into that
--      category — scoped to devkane2343@gmail.com only.
--   3) Leaves a verification SELECT at the end.
--
-- IMPORTANT (frontend follow-up): the app decides "is this savings?" in
--   lib/utils.ts -> isSavingsCategory(). Today it only returns true for
--   'Emergency Fund' and 'General Savings'. After running this migration you
--   MUST also add 'Pag-IBIG MP2' there (and to the Category enum in types.ts)
--   or the app will still subtract MP2 as a spent expense. See notes at bottom.
--
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Allow 'Pag-IBIG MP2' in the expenses.category CHECK constraint.
--    We drop whatever category check currently exists (name may vary by DB),
--    then recreate it with the new value included. Follows the same pattern as
--    bills_loan_support.sql.
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
-- 2) Re-tag existing MP2 expense rows for devkane2343@gmail.com.
--
--    Match heuristic: the description mentions MP2 or Pag-IBIG (the MP2 program
--    is often written "Pag-IBIG MP2", "MP2", "Modified Pag-IBIG 2", etc.).
--    We only touch rows that are NOT already a savings category, so re-running
--    is idempotent and we never clobber a correctly-categorised row.
--
--    NOTE: mandatory Pag-IBIG (the regular fund) is usually the `pagibig`
--    column on income_history, not an expense row — so this description-based
--    match on the expenses table specifically catches the MP2 voluntary
--    contributions you logged as expenses. Adjust the ILIKE list if your
--    descriptions use different wording.
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
    raise notice 'User devkane2343@gmail.com not found — no rows re-tagged.';
    return;
  end if;

  update public.expenses
  set category = 'Pag-IBIG MP2'
  where user_id = target_uid
    and category not in ('Pag-IBIG MP2', 'Emergency Fund', 'General Savings', 'Savings')
    and (
         description ilike '%mp2%'
      or description ilike '%mp-2%'
      or description ilike '%modified pag%'
      or description ilike '%pagibig mp%'
      or description ilike '%pag-ibig mp%'
    );

  get diagnostics affected = row_count;
  raise notice 'Re-tagged % expense row(s) as Pag-IBIG MP2 for %', affected, target_uid;
end $$;

commit;

-- ----------------------------------------------------------------------------
-- 3) Verify — review what is now tagged as MP2 for this user.
--    (Read-only; safe to run any time.)
-- ----------------------------------------------------------------------------
select e.date, e.category, e.amount, e.description
from public.expenses e
join auth.users u on u.id = e.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and e.category = 'Pag-IBIG MP2'
order by e.date desc;

-- ============================================================================
-- FRONTEND FOLLOW-UP (required so the app actually treats MP2 as savings)
-- ============================================================================
-- 1) types.ts  — add to the Category enum:
--        PagibigMP2 = 'Pag-IBIG MP2',
--
-- 2) lib/utils.ts — extend isSavingsCategory so MP2 counts as savings, not spend:
--        export const isSavingsCategory = (category: string): boolean =>
--          category === Category.EmergencyFund ||
--          category === Category.GeneralSavings ||
--          category === Category.Savings ||       // if you want plain "Savings" too
--          category === Category.PagibigMP2;
--
--    This one change makes MP2 flow into "Total Savings" and out of
--    "Lifetime Expenses" / "Total expenses" everywhere (SummaryCards,
--    AnalyticsSummary), because both read from isSavingsCategory().
--
-- 3) (optional) add 'Pag-IBIG MP2' to the category dropdown in the expense
--    form so future MP2 entries are tagged directly.
-- ============================================================================
