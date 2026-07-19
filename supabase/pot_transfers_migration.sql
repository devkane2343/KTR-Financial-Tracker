-- ============================================================================
-- Pot transfers — "move money between my own accounts" (bank transfer to self)
-- ============================================================================
-- Records a movement of money from one of the user's pots to another: Wallet,
-- Debit Card, a savings bucket (Emergency Fund / General Savings / Other /
-- Pag-IBIG MP2), or a custom savings card. This is NOT income and NOT an
-- expense — net worth is unchanged; only the split between pots moves.
--
-- HOW BALANCES ACTUALLY MOVE (the app does this, not this table):
--   • Stored pots (Wallet, Debit, custom cards) are numeric balances the app
--     decrements/increments directly.
--   • Computed buckets (EF / General / Other / MP2) are sums of expense rows, so
--     the app writes signed expense rows tagged transfer_id to shift them
--     (negative on the "from" side, positive on the "to" side).
--
-- This table is the AUDIT LOG so a transfer can be listed and undone as a unit.
-- Run in Supabase SQL Editor AFTER expense_source_migration.sql. Safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.pot_transfers (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  -- Each side is a pot pointer: { kind, id, label } (same shape as expense.source).
  from_pot   jsonb not null,
  to_pot     jsonb not null,
  amount     numeric(12,2) not null check (amount > 0),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pot_transfers_user_id on public.pot_transfers(user_id);
create index if not exists idx_pot_transfers_date on public.pot_transfers(date desc);

alter table public.pot_transfers enable row level security;

drop policy if exists "Users can manage own transfers" on public.pot_transfers;
create policy "Users can manage own transfers" on public.pot_transfers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
