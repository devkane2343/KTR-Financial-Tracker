import { supabase } from './supabase';
import { MP2_TERM_YEARS, MP2_LATEST_RATE_PCT, type Mp2PayoutMode } from './mp2Projection';

/**
 * Persists the Pag-IBIG MP2 Projection tab's assumptions (monthly contribution,
 * payout mode, per-year dividend rates) so they survive reopening the modal and
 * follow the user across devices. One row per user, RLS-scoped — reads never
 * pass a user_id. Degrades gracefully: if the table doesn't exist yet (migration
 * not run), load returns { ok: true, value: null } and save reports a clear
 * "run the migration" error rather than crashing.
 *
 * See supabase/mp2_projection_settings_migration.sql.
 */

export interface Mp2ProjectionSettings {
  monthlyContribution: number;
  mode: Mp2PayoutMode;
  /** Per-year assumed dividend rates (%). Length normalized to MP2_TERM_YEARS. */
  ratesPct: number[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Ok = { ok: true } | { ok: false; error: string };

const TABLE = 'mp2_projection_settings';

/** True when an error means the table hasn't been migrated in yet. */
const isMissingTable = (error: { code?: string; message?: string } | null): boolean =>
  !!error && (error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message ?? ''));

const clampMoney = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const normMode = (v: unknown): Mp2PayoutMode => (v === 'annual' ? 'annual' : 'compounded');

/**
 * Coerce arbitrary JSON into a clean per-year rate array of exactly
 * MP2_TERM_YEARS entries: each clamped to 0–100, missing/short arrays padded
 * with the latest declared rate so the projection always has a full 5 years.
 */
function normRates(v: unknown): number[] {
  const src = Array.isArray(v) ? v : [];
  const out: number[] = [];
  for (let i = 0; i < MP2_TERM_YEARS; i++) {
    const n = Number(src[i]);
    out.push(Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : MP2_LATEST_RATE_PCT);
  }
  return out;
}

/**
 * Read this user's saved projection settings.
 *   • no row yet         → { ok: true, value: null } (use derived defaults)
 *   • table not migrated → { ok: true, value: null } (graceful)
 *   • real error         → { ok: false, error }
 */
export async function loadMp2ProjectionSettings(): Promise<Result<Mp2ProjectionSettings | null>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to load your projection.' };

  const { data, error } = await supabase
    .from(TABLE)
    .select('monthly_contribution, payout_mode, rates_pct')
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return { ok: true, value: null };
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: true, value: null };

  return {
    ok: true,
    value: {
      monthlyContribution: clampMoney(data.monthly_contribution),
      mode: normMode(data.payout_mode),
      ratesPct: normRates(data.rates_pct),
    },
  };
}

/** Upsert this user's projection settings (one row per user). */
export async function saveMp2ProjectionSettings(s: Mp2ProjectionSettings): Promise<Ok> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to save.' };

  const row = {
    user_id: user.id,
    monthly_contribution: clampMoney(s.monthlyContribution),
    payout_mode: normMode(s.mode),
    rates_pct: normRates(s.ratesPct),
  };

  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'user_id' });

  if (error) {
    if (isMissingTable(error)) {
      return { ok: false, error: 'Run the mp2_projection_settings migration in Supabase to enable saving.' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
