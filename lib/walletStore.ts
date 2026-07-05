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
