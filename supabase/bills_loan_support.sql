-- ============================================================================
-- Bills: loan support (finite installments)
-- Adds the 'Loan' category and a total_payments column.
-- Run in Supabase SQL editor after bills_due_date_migration.sql.
-- Safe to run multiple times.
-- ============================================================================

-- 1) Allow 'Loan' in category check constraint
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'bills'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%category%';

  if conname is not null then
    execute format('alter table public.bills drop constraint %I', conname);
  end if;
end $$;

alter table public.bills
  add constraint bills_category_check
  check (category in ('Insurance','Utilities','Rent','Internet','Loan','Other'));

-- 2) Add total_payments column (NULL = recurring forever, integer = installment count)
alter table public.bills
  add column if not exists total_payments integer
    check (total_payments is null or total_payments > 0);
