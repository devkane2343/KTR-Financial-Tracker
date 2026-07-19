import { supabase } from './supabase';
import type { ExpenseSource, PotTransfer } from '../types';

/**
 * CRUD for pot_transfers — the audit log of money moved between the user's own
 * pots. The actual BALANCE effects live elsewhere (wallet_balance / custom card
 * rows for stored pots, signed transfer_id expense rows for computed buckets);
 * this store only persists the transfer record itself so it can be listed/undone.
 *
 * RLS scopes every query to the signed-in user. Missing table degrades to [] /
 * a clear error, mirroring customSavingsStore's resilience.
 * See supabase/pot_transfers_migration.sql.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Ok = { ok: true } | { ok: false; error: string };

function fromRow(r: {
  id: string;
  date: string;
  from_pot: ExpenseSource;
  to_pot: ExpenseSource;
  amount: number | string | null;
  note: string | null;
}): PotTransfer {
  return {
    id: r.id,
    date: r.date,
    from: r.from_pot,
    to: r.to_pot,
    amount: Number(r.amount ?? 0),
    note: r.note ?? undefined,
  };
}

/** Read all of this user's transfers, newest first. Missing table degrades to []. */
export async function loadTransfers(): Promise<Result<PotTransfer[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to load transfers.' };

  const { data, error } = await supabase
    .from('pot_transfers')
    .select('id, date, from_pot, to_pot, amount, note')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'PGRST205' || /does not exist|schema cache/i.test(error.message)) {
      return { ok: true, value: [] };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, value: (data ?? []).map(fromRow) };
}

/** Persist one transfer record; returns it with the DB-generated id. */
export async function createTransfer(
  input: { date: string; from: ExpenseSource; to: ExpenseSource; amount: number; note?: string },
): Promise<Result<PotTransfer>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to transfer.' };

  const { data, error } = await supabase
    .from('pot_transfers')
    .insert({
      user_id: user.id,
      date: input.date,
      from_pot: input.from,
      to_pot: input.to,
      amount: Math.abs(input.amount),
      note: input.note ?? null,
    })
    .select('id, date, from_pot, to_pot, amount, note')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, value: fromRow(data) };
}

/** Delete one transfer record (used when undoing). RLS enforces ownership. */
export async function deleteTransfer(id: string): Promise<Ok> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to delete.' };

  const { error } = await supabase.from('pot_transfers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
