-- ============================================================================
-- Custom, user-created savings accounts (Net Worth tab)
-- ============================================================================
-- One row per user-created savings card. Each card is its own savings account
-- with an independent balance, a per-card liquidity flag, and an optional
-- background image stored in the `card-backgrounds` Storage bucket (this table
-- keeps only the object PATH, not the image bytes — resolve to a URL at read
-- time via getPublicUrl, same discipline as avatars).
--
-- These accounts count toward net worth client-side (see components/NetWorthTab
-- .tsx); the `net_worth` view is intentionally NOT changed here.
--
-- Run in Supabase SQL Editor AFTER add_debit_balance.sql. Safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.custom_savings_accounts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null default 'Savings',
  balance         numeric(12,2) not null default 0 check (balance >= 0),
  liquidity       text not null default 'liquid' check (liquidity in ('liquid', 'nonliquid')),
  background_path text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_custom_savings_accounts_user_id
  on public.custom_savings_accounts(user_id);

-- RLS: each user only ever sees / writes their own rows (mirrors wallet_balance,
-- income_history, expenses). Reads never pass user_id — the policy scopes them.
alter table public.custom_savings_accounts enable row level security;

drop policy if exists "Users can manage own custom savings" on public.custom_savings_accounts;
create policy "Users can manage own custom savings" on public.custom_savings_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh. Reuse the shared function from schema.sql; define it
-- here too (create or replace) so this file is standalone-safe on a fresh DB.
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_custom_savings_accounts_updated_at on public.custom_savings_accounts;
create trigger trigger_custom_savings_accounts_updated_at
  before update on public.custom_savings_accounts
  for each row execute function update_updated_at_column();
