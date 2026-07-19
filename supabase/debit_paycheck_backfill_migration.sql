-- ============================================================================
-- One-time guard for the "salary lands on the Debit Card" reconciliation
-- ============================================================================
-- Going forward, logging a paycheck credits its take-home to the Debit Card
-- balance (and editing/deleting reconciles it). But paychecks logged BEFORE
-- that change never credited Debit, so the app runs a ONE-TIME backfill: it
-- sums the take-home of every existing paycheck and adds it to the current
-- Debit balance, once.
--
-- This column is the guard that makes it exactly once (per user, across
-- devices — a localStorage flag couldn't). The app:
--   • on load, if debit_backfilled_at IS NULL → add Σ take-home to debit_balance,
--     then stamp debit_backfilled_at = now();
--   • if it's already set → skip (never double-credits).
--
-- Additive + nullable, so existing rows are untouched and any user who never
-- had a wallet_balance row simply gets one created with the stamp when the app
-- first writes their Debit balance. Run in Supabase SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.wallet_balance
  add column if not exists debit_backfilled_at timestamptz;
