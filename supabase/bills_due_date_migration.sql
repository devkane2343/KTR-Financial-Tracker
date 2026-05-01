-- ============================================================================
-- Bills: due-date model + bill_payments history
-- Run this in the Supabase SQL editor.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).
-- ============================================================================

-- 1) Add new columns to bills
alter table public.bills
  add column if not exists category text not null default 'Other'
    check (category in ('Insurance','Utilities','Rent','Internet','Other')),
  add column if not exists due_date date,
  add column if not exists active boolean not null default true;

-- 2) Backfill due_date for any existing rows.
--    If paid_date exists on this DB, next due is one month after the last paid;
--    otherwise default to today. Wrapped in DO block so it works whether or not
--    paid_date column exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bills' and column_name = 'paid_date'
  ) then
    execute $sql$
      update public.bills
      set due_date = coalesce(due_date, (paid_date::date + interval '1 month')::date, current_date)
      where due_date is null
    $sql$;
  else
    update public.bills
    set due_date = current_date
    where due_date is null;
  end if;
end $$;

-- 3) Make due_date required going forward
alter table public.bills
  alter column due_date set not null;

-- 4) Drop the legacy paid_date column if it still exists (history now lives in bill_payments)
alter table public.bills
  drop column if exists paid_date;

-- 5) Create the bill_payments table
create table if not exists public.bill_payments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  due_date date not null,
  paid_date date not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (bill_id, due_date)
);

create index if not exists bill_payments_user_id_idx on public.bill_payments(user_id);
create index if not exists bill_payments_bill_id_idx on public.bill_payments(bill_id);

-- 6) Row Level Security
alter table public.bill_payments enable row level security;

drop policy if exists "bill_payments_select_own" on public.bill_payments;
create policy "bill_payments_select_own"
  on public.bill_payments for select
  using (auth.uid() = user_id);

drop policy if exists "bill_payments_insert_own" on public.bill_payments;
create policy "bill_payments_insert_own"
  on public.bill_payments for insert
  with check (auth.uid() = user_id);

drop policy if exists "bill_payments_update_own" on public.bill_payments;
create policy "bill_payments_update_own"
  on public.bill_payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "bill_payments_delete_own" on public.bill_payments;
create policy "bill_payments_delete_own"
  on public.bill_payments for delete
  using (auth.uid() = user_id);
