import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Expense, ExpenseSource, IncomeEntry } from '../types';
import { Category } from '../types';
import { loadWalletBalances, saveWalletBalance } from './walletStore';
import {
  loadCustomSavingsAccounts,
  updateCustomSavingsAccount,
  type CustomSavingsAccount,
} from './customSavingsStore';
import { getSavingsBreakdown, generateId, getLocalDateString, type SavingsBucket } from './utils';
import { createTransfer } from './transferStore';
import { appendValueSnapshot } from './investmentHistoryStore';
import type { FundingSource } from '../components/ExpenseForm';

/** Outcome of a self-transfer: the signed bucket-leg rows to add to data.expenses. */
export interface TransferResult {
  ok: boolean;
  error?: string;
  /** Synthetic transfer_id expense rows (may be empty for stored↔stored moves). */
  expenseRows: Expense[];
  /** The persisted transfer's id, if the log row was written. */
  transferId?: string;
}

/**
 * Owns the liquid-balance side of expense funding: the stored Wallet/Debit pots
 * and the custom savings cards, plus the computed EF/General/Other buckets. It
 * exposes:
 *   - `fundingSources`: the pickable pots (with live balances) for the form.
 *   - `applySource` / `reverseSource`: side-effects that adjust a pot when an
 *     expense with a source is added / removed.
 *   - `withdrawalRowsFor` / helpers: build the synthetic negative expense rows
 *     that lower a computed savings bucket.
 *
 * Wallet/Debit/custom are STORED balances → decrement the row directly.
 * EF/General/Other are COMPUTED from expense+income rows → we can't "set" them,
 * so pulling from them is modeled as a negative withdrawal expense row that the
 * caller adds to `data.expenses` (and removes on reversal).
 *
 * Only LIQUID pots are offered: Pag-IBIG MP2 and non-liquid custom cards are
 * excluded, matching the Net Worth tab's liquid/non-liquid split.
 */

/** SavingsBucket → the Category its withdrawal rows live in. */
const BUCKET_CATEGORY: Record<SavingsBucket, Category> = {
  emergencyFund: Category.EmergencyFund,
  generalSavings: Category.GeneralSavings,
  pagibigMP2: Category.PagibigMP2,
  other: Category.Savings,
};

const BUCKET_LABEL: Record<SavingsBucket, string> = {
  emergencyFund: 'Emergency Fund',
  generalSavings: 'General Savings',
  pagibigMP2: 'Pag-IBIG MP2',
  other: 'Other Savings',
};

export interface UseFundingSources {
  /** Liquid pots only — the valid sources to FUND an expense from. */
  fundingSources: FundingSource[];
  /** Every pot (incl. MP2 + non-liquid customs) — the endpoints a transfer allows. */
  allPots: FundingSource[];
  loaded: boolean;
  /**
   * Apply an expense's funding source to the stored pots (Wallet/Debit/custom).
   * No-op for savings-bucket sources — those are handled via withdrawal rows.
   * Returns the persistence promise so callers can surface errors.
   */
  applySource: (source: ExpenseSource, amount: number) => Promise<{ ok: boolean; error?: string }>;
  /** Reverse a previously-applied source (credit the amount back). */
  reverseSource: (source: ExpenseSource, amount: number) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Build the synthetic negative withdrawal row for a savings-bucket-funded
   * expense, or null if the source isn't a savings bucket. The row carries a
   * NEGATIVE amount in the bucket's category and links back via savingsWithdrawalFor.
   */
  buildWithdrawalRow: (parent: Expense) => Expense | null;
  /**
   * Move money between two of the user's own pots. Persists stored-pot balance
   * changes + the audit log, and returns any signed bucket-leg expense rows the
   * caller must add to data.expenses. See the implementation for details.
   */
  transfer: (
    from: ExpenseSource,
    to: ExpenseSource,
    amount: number,
    date: string,
    note?: string,
  ) => Promise<TransferResult>;
}

export function useFundingSources(
  incomeHistory: IncomeEntry[],
  expenses: Expense[],
  /**
   * True while the Expenses tab is on screen. Each time it flips to true we
   * re-pull the stored balances so the "available" figures in the dropdown
   * reflect any edits made on the Net Worth tab since. Defaults to true (load once).
   */
  active: boolean = true,
): UseFundingSources {
  const [wallet, setWallet] = useState(0);
  const [debit, setDebit] = useState(0);
  const [customAccounts, setCustomAccounts] = useState<CustomSavingsAccount[]>([]);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [customLoaded, setCustomLoaded] = useState(false);

  // Refs mirror the balances so adjustStored always reads/writes the FRESHEST
  // value, never a stale render closure. This is what makes two legs of one
  // transfer (and any re-entry) compose correctly instead of double-counting off
  // the same starting balance.
  const walletRef = useRef(0);
  const debitRef = useRef(0);
  const customRef = useRef<CustomSavingsAccount[]>([]);
  const setWalletBoth = useCallback((v: number) => { walletRef.current = v; setWallet(v); }, []);
  const setDebitBoth = useCallback((v: number) => { debitRef.current = v; setDebit(v); }, []);
  const setCustomBoth = useCallback((next: CustomSavingsAccount[]) => { customRef.current = next; setCustomAccounts(next); }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    loadWalletBalances().then((res) => {
      if (cancelled) return;
      if (res.ok) { setWalletBoth(res.balances.wallet); setDebitBoth(res.balances.debit); }
      setWalletLoaded(true);
    });
    loadCustomSavingsAccounts().then((res) => {
      if (cancelled) return;
      if (res.ok) setCustomBoth(res.value);
      setCustomLoaded(true);
    });
    return () => { cancelled = true; };
  }, [active, setWalletBoth, setDebitBoth, setCustomBoth]);

  // Computed liquid savings buckets (EF/General/Other) — MP2 is non-liquid.
  const savings = useMemo(
    () => getSavingsBreakdown(incomeHistory, expenses),
    [incomeHistory, expenses],
  );

  const fundingSources: FundingSource[] = useMemo(() => {
    const list: FundingSource[] = [
      { key: 'wallet', balance: wallet, source: { kind: 'wallet', label: 'Money on my wallet' } },
      { key: 'debit', balance: debit, source: { kind: 'debit', label: 'Debit Card' } },
    ];

    // Liquid computed buckets. Only offer a bucket if it has money to pull.
    const liquidBuckets: SavingsBucket[] = ['emergencyFund', 'generalSavings', 'other'];
    for (const b of liquidBuckets) {
      const balance = savings[b];
      if (balance > 0) {
        list.push({ key: `savings:${b}`, balance, source: { kind: 'savings', id: b, label: BUCKET_LABEL[b] } });
      }
    }

    // Liquid custom cards — but NOT investment/VUL cards (you can't spend a
    // fund value like cash; those are transfer-in-only assets).
    for (const a of customAccounts) {
      if (a.liquidity === 'liquid' && a.accountType !== 'investment') {
        list.push({ key: `custom:${a.id}`, balance: a.balance, source: { kind: 'custom', id: a.id, label: a.name } });
      }
    }

    return list;
  }, [wallet, debit, savings, customAccounts]);

  // Every pot, liquid or not — the full set a self-transfer can move between
  // (adds Pag-IBIG MP2 and non-liquid custom cards, which expense-funding omits).
  // Order: Wallet, Debit, all four buckets, then every custom card.
  const allPots: FundingSource[] = useMemo(() => {
    const list: FundingSource[] = [
      { key: 'wallet', balance: wallet, source: { kind: 'wallet', label: 'Money on my wallet' } },
      { key: 'debit', balance: debit, source: { kind: 'debit', label: 'Debit Card' } },
    ];
    const allBuckets: SavingsBucket[] = ['emergencyFund', 'generalSavings', 'other', 'pagibigMP2'];
    for (const b of allBuckets) {
      const balance = savings[b];
      // Skip only "Other" when empty (it's not a first-class card); always show
      // EF / General / MP2 so you can transfer INTO an empty bucket.
      if (b === 'other' && balance <= 0) continue;
      list.push({ key: `savings:${b}`, balance, source: { kind: 'savings', id: b, label: BUCKET_LABEL[b] } });
    }
    for (const a of customAccounts) {
      list.push({ key: `custom:${a.id}`, balance: a.balance, source: { kind: 'custom', id: a.id, label: a.name } });
    }
    return list;
  }, [wallet, debit, savings, customAccounts]);

  // Persist a delta against a stored pot and mirror it into local state so the
  // dropdown balances stay live within the session. `sign` is -1 to spend, +1 to
  // refund. Savings buckets have no stored row here (handled via withdrawal rows).
  const adjustStored = useCallback(
    async (source: ExpenseSource, amount: number, sign: 1 | -1): Promise<{ ok: boolean; error?: string }> => {
      const delta = sign * amount;
      if (source.kind === 'wallet') {
        const next = Math.max(0, walletRef.current + delta);
        const res = await saveWalletBalance('wallet', next);
        if (res.ok) setWalletBoth(next);
        return res.ok ? { ok: true } : { ok: false, error: res.error };
      }
      if (source.kind === 'debit') {
        const next = Math.max(0, debitRef.current + delta);
        const res = await saveWalletBalance('debit', next);
        if (res.ok) setDebitBoth(next);
        return res.ok ? { ok: true } : { ok: false, error: res.error };
      }
      if (source.kind === 'custom' && source.id) {
        const acct = customRef.current.find(a => a.id === source.id);
        if (!acct) return { ok: true }; // card deleted since; nothing to adjust
        const next = Math.max(0, acct.balance + delta);
        // For an investment/VUL card, money moved IN is a contribution: raise its
        // cost basis alongside the fund value, and record a dated snapshot so the
        // growth chart captures the new point. (Investments are never debited —
        // they can't fund expenses and can't be a transfer SOURCE.)
        const isInvestment = acct.accountType === 'investment';
        const nextContributed = isInvestment && delta > 0
          ? Math.max(0, acct.contributedValue + delta)
          : acct.contributedValue;
        const patch = isInvestment && delta > 0
          ? { balance: next, contributedValue: nextContributed }
          : { balance: next };
        const res = await updateCustomSavingsAccount(source.id, patch);
        if (!res.ok) return { ok: false, error: res.error };
        setCustomBoth(customRef.current.map(a =>
          a.id === source.id ? { ...a, balance: next, contributedValue: nextContributed } : a));
        if (isInvestment && delta > 0) {
          // Non-fatal: snapshot failure never blocks the transfer.
          await appendValueSnapshot(source.id, next, nextContributed, getLocalDateString());
        }
        return { ok: true };
      }
      // Savings bucket: no stored row — the caller's withdrawal expense row does it.
      return { ok: true };
    },
    [setWalletBoth, setDebitBoth, setCustomBoth],
  );

  const applySource = useCallback(
    (source: ExpenseSource, amount: number) => adjustStored(source, amount, -1),
    [adjustStored],
  );
  const reverseSource = useCallback(
    (source: ExpenseSource, amount: number) => adjustStored(source, amount, +1),
    [adjustStored],
  );

  const buildWithdrawalRow = useCallback((parent: Expense): Expense | null => {
    if (parent.source?.kind !== 'savings' || !parent.source.id) return null;
    const bucket = parent.source.id as SavingsBucket;
    const category = BUCKET_CATEGORY[bucket];
    if (!category) return null;
    return {
      id: generateId(),
      date: parent.date,
      category,
      amount: -Math.abs(parent.amount),
      description: `Withdrawn to cover: ${parent.description || parent.category}`,
      savingsWithdrawalFor: parent.id,
    };
  }, []);

  // One leg of a transfer that touches a COMPUTED bucket: a signed expense row in
  // that bucket's category (negative = money leaving, positive = money arriving).
  const buildBucketLeg = useCallback(
    (pot: ExpenseSource, signedAmount: number, transferId: string, date: string, otherLabel: string): Expense | null => {
      if (pot.kind !== 'savings' || !pot.id) return null;
      const category = BUCKET_CATEGORY[pot.id as SavingsBucket];
      if (!category) return null;
      const leaving = signedAmount < 0;
      return {
        id: generateId(),
        date,
        category,
        amount: signedAmount,
        description: leaving ? `Transferred to ${otherLabel}` : `Transferred from ${otherLabel}`,
        transferId,
      };
    },
    [],
  );

  /**
   * Move `amount` from one pot to another. Applies stored-pot balance changes
   * directly, returns the signed expense rows for any computed-bucket legs (the
   * caller must add these to data.expenses), and writes the audit-log row.
   * `from` and `to` must differ. Amount must be > 0 and ≤ the from-pot balance.
   */
  // Synchronous in-flight lock: a second transfer() call (double-submit, a rogue
  // re-render) is rejected outright before it can re-apply the same balance move.
  const transferInFlight = useRef(false);

  const transfer = useCallback(
    async (from: ExpenseSource, to: ExpenseSource, amount: number, date: string, note?: string): Promise<TransferResult> => {
      const amt = Math.abs(amount);
      if (!(amt > 0)) return { ok: false, error: 'Enter an amount greater than zero.', expenseRows: [] };
      if (from.kind === to.kind && (from.id ?? '') === (to.id ?? '')) {
        return { ok: false, error: 'Pick two different accounts.', expenseRows: [] };
      }
      // Investment/VUL cards are transfer-IN only — you can't move money OUT of a
      // fund value like cash. Block them as a source.
      if (from.kind === 'custom' && from.id) {
        const acct = customRef.current.find(a => a.id === from.id);
        if (acct?.accountType === 'investment') {
          return { ok: false, error: `You can't transfer out of ${acct.name} — it's an investment. Update its fund value by editing the card.`, expenseRows: [] };
        }
      }
      if (transferInFlight.current) {
        return { ok: false, error: 'A transfer is already in progress.', expenseRows: [] };
      }
      transferInFlight.current = true;
      try {

      // Debit the source, then credit the destination (stored pots persist here;
      // bucket legs are no-ops in adjustStored and handled via the rows below).
      const debitRes = await adjustStored(from, amt, -1);
      if (!debitRes.ok) return { ok: false, error: debitRes.error, expenseRows: [] };
      const creditRes = await adjustStored(to, amt, +1);
      if (!creditRes.ok) {
        // Best-effort roll back the debit so money isn't lost on partial failure.
        await adjustStored(from, amt, +1);
        return { ok: false, error: creditRes.error, expenseRows: [] };
      }

      // Persist the audit-log row (non-fatal: the balances already moved).
      const logId = generateId();
      let transferId = logId;
      const logRes = await createTransfer({ date, from, to, amount: amt, note });
      if (logRes.ok) transferId = logRes.value.id;

      // Computed-bucket legs become signed transfer_id expense rows.
      const rows: Expense[] = [];
      const fromLeg = buildBucketLeg(from, -amt, transferId, date, to.label);
      const toLeg = buildBucketLeg(to, +amt, transferId, date, from.label);
      if (fromLeg) rows.push(fromLeg);
      if (toLeg) rows.push(toLeg);

      return { ok: true, expenseRows: rows, transferId };
      } finally {
        transferInFlight.current = false;
      }
    },
    [adjustStored, buildBucketLeg],
  );

  return {
    fundingSources,
    allPots,
    loaded: walletLoaded && customLoaded,
    applySource,
    reverseSource,
    buildWithdrawalRow,
    transfer,
  };
}
