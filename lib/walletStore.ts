import { supabase } from './supabase';

/**
 * wallet_balance holds two independent pots per user:
 *   - balance        → "Money on my wallet" (cash on hand)
 *   - debit_balance   → the Debit Card balance (e.g. MariBank)
 * Both roll into net worth. RLS scopes every query to the signed-in user,
 * so we never pass a user_id on read.
 * See supabase/networth_wallet_migration.sql + supabase/add_debit_balance.sql.
 */

export interface WalletBalances {
  wallet: number;
  debit: number;
}

export type WalletLoadResult =
  | { ok: true; balances: WalletBalances }
  | { ok: false; error: string };

export type WalletSaveResult = { ok: true } | { ok: false; error: string };

/** Which pot a save targets. */
export type BalanceField = 'wallet' | 'debit';

const COLUMN: Record<BalanceField, 'balance' | 'debit_balance'> = {
  wallet: 'balance',
  debit: 'debit_balance',
};

/** Read both balances. Missing table/column degrades to 0 rather than crashing. */
export async function loadWalletBalances(): Promise<WalletLoadResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to load your balances.' };

  const { data, error } = await supabase
    .from('wallet_balance')
    .select('balance, debit_balance')
    .maybeSingle();

  if (error) {
    // Table not created yet, or debit_balance column not added yet.
    if (/does not exist/i.test(error.message)) {
      return { ok: true, balances: { wallet: 0, debit: 0 } };
    }
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    balances: {
      wallet: data ? Number(data.balance ?? 0) : 0,
      debit: data ? Number((data as { debit_balance?: number }).debit_balance ?? 0) : 0,
    },
  };
}

/**
 * One-time paycheck→Debit backfill. If this user hasn't been backfilled yet
 * (debit_backfilled_at is null), add `takeHomeTotal` to their Debit balance and
 * stamp the flag so it never runs again — even on another device. Returns the
 * new debit balance when it ran, or `ran: false` when it was already done (or
 * the guard column/table isn't migrated yet, in which case we skip quietly).
 *
 * The read-then-write isn't a DB transaction, but the flag makes a concurrent
 * double-run on two tabs benign in practice: the second read still sees null
 * only within a tiny window, and the worst case is a one-time re-add the user
 * can correct on the Net Worth tab. Keeping it simple beats a stored proc here.
 */
export type DebitBackfillResult =
  | { ok: true; ran: true; debit: number }
  | { ok: true; ran: false }
  | { ok: false; error: string };

export async function backfillDebitFromPaychecks(takeHomeTotal: number): Promise<DebitBackfillResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in.' };

  const { data, error } = await supabase
    .from('wallet_balance')
    .select('debit_balance, debit_backfilled_at')
    .maybeSingle();

  if (error) {
    // Guard column / table not migrated yet → skip silently, try again next load.
    if (/does not exist/i.test(error.message)) return { ok: true, ran: false };
    return { ok: false, error: error.message };
  }

  // Already backfilled for this user — never credit twice.
  if (data && (data as { debit_backfilled_at?: string | null }).debit_backfilled_at) {
    return { ok: true, ran: false };
  }

  const current = data ? Number((data as { debit_balance?: number }).debit_balance ?? 0) : 0;
  const add = Number.isFinite(takeHomeTotal) ? Math.max(0, takeHomeTotal) : 0;
  const next = current + add;

  const { error: upErr } = await supabase
    .from('wallet_balance')
    .upsert(
      { user_id: user.id, debit_balance: next, debit_backfilled_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true, ran: true, debit: next };
}

/** Set one pot (upsert one row for this user, only touching the target column). */
export async function saveWalletBalance(field: BalanceField, amount: number): Promise<WalletSaveResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to save.' };

  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const row = { user_id: user.id, [COLUMN[field]]: safe };

  const { error } = await supabase
    .from('wallet_balance')
    .upsert(row, { onConflict: 'user_id' });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
