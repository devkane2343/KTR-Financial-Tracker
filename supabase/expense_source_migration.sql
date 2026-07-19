-- ============================================================================
-- Expense funding source — "pull this expense from a liquid pot"
-- ============================================================================
-- Lets an expense record WHERE its money came from (Wallet, Debit Card, a
-- liquid savings bucket, or a custom savings card) so the app can auto-deduct
-- that pot when the expense is logged and reverse it when the expense is removed.
--
-- Two new columns on public.expenses:
--   source                 JSONB  — { kind, id, label }; null = untagged (legacy).
--   savings_withdrawal_for TEXT   — parent expense id for synthetic negative
--                                   "withdrawal" rows that lower a computed
--                                   savings bucket (EF / General / Other).
--
-- Both are additive and nullable, so existing rows and the existing save/load
-- paths keep working unchanged. Run in Supabase SQL Editor. Safe to re-run.
--
-- NOTE ON THE net_worth VIEW: savings buckets (EF / General / Other) already sum
-- their expense rows, so the negative withdrawal rows lower those buckets with
-- NO view change needed. Wallet/Debit/custom balances are stored numbers the app
-- decrements directly, also needing no view change. Nothing here touches the view.
-- ============================================================================

alter table public.expenses
  add column if not exists source jsonb;

alter table public.expenses
  add column if not exists savings_withdrawal_for text;

-- A leg of a self-transfer that touches a computed bucket (EF/General/Other/MP2)
-- carries a signed amount in that bucket's category, tagged with the transfer id.
alter table public.expenses
  add column if not exists transfer_id text;

-- Helpful when reversing: find the withdrawal paired to a parent expense fast.
create index if not exists idx_expenses_savings_withdrawal_for
  on public.expenses(savings_withdrawal_for)
  where savings_withdrawal_for is not null;

-- Helpful when undoing a transfer: gather both legs by their shared transfer id.
create index if not exists idx_expenses_transfer_id
  on public.expenses(transfer_id)
  where transfer_id is not null;

-- The expenses table ships with CHECK (amount >= 0) (see schema.sql). Synthetic
-- withdrawal rows carry a NEGATIVE amount, so that constraint must go. Drop ANY
-- check constraint that references the amount column, whatever it's named.
do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'expenses'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%amount%'
  loop
    execute format('alter table public.expenses drop constraint %I', rec.conname);
    raise notice 'Dropped amount check constraint: %', rec.conname;
  end loop;
end $$;
