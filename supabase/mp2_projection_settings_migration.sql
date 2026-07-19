-- ============================================================================
-- MP2 projection settings — remembers the Pag-IBIG MP2 Projection tab inputs
-- ============================================================================
-- The MP2 card's modal has a Projection tab that forecasts the 5-year maturity
-- value from the current MP2 balance. This table persists the user's projection
-- ASSUMPTIONS so they survive reopening the modal / switching devices:
--   • monthly_contribution → the recurring monthly amount fed into the forecast.
--   • payout_mode          → 'compounded' or 'annual'.
--   • rates_pct            → the per-year assumed dividend rates, e.g. [7.12, 7.12, …].
--
-- One row per user (user_id is the PK). These are projection inputs only — no
-- real money moves here; the actual MP2 balance stays computed from tagged
-- expense rows. Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists public.mp2_projection_settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  monthly_contribution  numeric(12,2) not null default 500 check (monthly_contribution >= 0),
  payout_mode           text not null default 'compounded'
                          check (payout_mode in ('compounded', 'annual')),
  -- Per-year assumed dividend rates (percent), e.g. [7.12, 7.12, 7.12, 7.12, 7.12].
  rates_pct             jsonb not null default '[]'::jsonb,
  updated_at            timestamptz not null default now()
);

alter table public.mp2_projection_settings enable row level security;

drop policy if exists "Users can manage own mp2 projection settings" on public.mp2_projection_settings;
create policy "Users can manage own mp2 projection settings" on public.mp2_projection_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bump updated_at on every write (mirrors the app's other timestamped tables).
create or replace function public.touch_mp2_projection_settings()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_mp2_projection_settings on public.mp2_projection_settings;
create trigger trg_touch_mp2_projection_settings
  before update on public.mp2_projection_settings
  for each row execute function public.touch_mp2_projection_settings();
