import { supabase } from './supabase';

/**
 * Dated fund-value snapshots for investment / VUL cards. Every time an
 * investment card's fund value is updated (via the editor or a transfer-in),
 * we append one snapshot here so the card can show a growth sparkline + a log
 * of "how much it was worth, and when".
 *
 * RLS scopes every query to the signed-in user. Missing table degrades to [] on
 * read and a non-fatal failure on write (the card still saves), mirroring
 * customSavingsStore's resilience. See supabase/investment_accounts_migration.sql.
 */

export interface ValueSnapshot {
  id: string;
  accountId: string;
  /** YYYY-MM-DD */
  asOf: string;
  fundValue: number;
  contributedValue: number;
  createdAt: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Ok = { ok: true } | { ok: false; error: string };

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

function fromRow(r: {
  id: string;
  account_id: string;
  as_of: string;
  fund_value: number | string | null;
  contributed_value: number | string | null;
  created_at: string;
}): ValueSnapshot {
  return {
    id: r.id,
    accountId: r.account_id,
    asOf: r.as_of,
    fundValue: Number(r.fund_value ?? 0),
    contributedValue: Number(r.contributed_value ?? 0),
    createdAt: r.created_at,
  };
}

/** True when the error just means the history table hasn't been created yet. */
function isMissingTable(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message);
}

/** Read one account's snapshots, OLDEST first (so a sparkline reads left→right). */
export async function loadValueHistory(accountId: string): Promise<Result<ValueSnapshot[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to load history.' };

  const { data, error } = await supabase
    .from('investment_value_history')
    .select('id, account_id, as_of, fund_value, contributed_value, created_at')
    .eq('account_id', accountId)
    .order('as_of', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTable(error)) return { ok: true, value: [] };
    return { ok: false, error: error.message };
  }
  return { ok: true, value: (data ?? []).map(fromRow) };
}

/**
 * Record one dated snapshot. UPSERT on (account_id, as_of): re-editing the fund
 * value on the same day overwrites that day's row rather than adding another —
 * so a day is always a single point and same-day corrections never render as a
 * fake growth line. Non-fatal: if the table is missing this returns { ok:false }
 * but the card itself is already saved, so only the history point is skipped.
 */
export async function appendValueSnapshot(
  accountId: string,
  fundValue: number,
  contributedValue: number,
  asOf: string,
): Promise<Ok> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to save.' };

  const { error } = await supabase.from('investment_value_history').upsert(
    {
      user_id: user.id,
      account_id: accountId,
      as_of: asOf,
      fund_value: clamp(fundValue),
      contributed_value: clamp(contributedValue),
    },
    { onConflict: 'account_id,as_of' },
  );

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: 'History table not set up yet.' };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
