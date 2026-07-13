import { supabase } from './supabase';
import { isValidUUID } from './utils';
import type { FinancialData, IncomeEntry, Expense, Bill, BillPayment, BillCategory } from '../types';

function toIncomeRow(entry: IncomeEntry, id: string, userId: string) {
  return {
    id,
    user_id: userId,
    date: entry.date,
    weekly_salary: entry.weeklySalary,
    sss: entry.sss,
    pagibig: entry.pagibig,
    philhealth: entry.philhealth,
    vul: entry.vul,
    emergency_fund: entry.emergencyFund ?? 0,
    general_savings: entry.generalSavings ?? 0,
    paid_bills: entry.paidBills ?? [],
  };
}

function toBillRow(bill: Bill, id: string, userId: string) {
  return {
    id,
    user_id: userId,
    name: bill.name,
    amount: bill.amount,
    category: bill.category,
    due_date: bill.dueDate,
    total_payments: bill.totalPayments ?? null,
    active: bill.active,
  };
}

function fromBillRow(row: {
  id: string;
  name: string;
  amount: number;
  category?: string | null;
  due_date?: string | null;
  total_payments?: number | null;
  active?: boolean | null;
  paid_date?: string | null;
}): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    category: ((row.category as BillCategory) ?? 'Other') as BillCategory,
    dueDate: row.due_date ?? row.paid_date ?? new Date().toISOString().slice(0, 10),
    totalPayments: row.total_payments ?? undefined,
    active: row.active ?? true,
  };
}

function toBillPaymentRow(payment: BillPayment, id: string, userId: string) {
  return {
    id,
    user_id: userId,
    bill_id: payment.billId,
    due_date: payment.dueDate,
    paid_date: payment.paidDate,
    amount: payment.amount,
  };
}

function fromBillPaymentRow(row: {
  id: string;
  bill_id: string;
  due_date: string;
  paid_date: string;
  amount: number;
}): BillPayment {
  return {
    id: row.id,
    billId: row.bill_id,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    amount: Number(row.amount),
  };
}

function toExpenseRow(expense: Expense, id: string, userId: string) {
  return {
    id,
    user_id: userId,
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    description: expense.description ?? '',
  };
}

function fromIncomeRow(row: {
  id: string;
  date: string;
  weekly_salary: number;
  sss: number;
  pagibig: number;
  philhealth: number;
  vul: number;
  emergency_fund?: number;
  general_savings?: number;
  paid_bills?: Array<{ billId: string; name: string; amount: number }>;
}): IncomeEntry {
  return {
    id: row.id,
    date: row.date,
    weeklySalary: Number(row.weekly_salary),
    sss: Number(row.sss),
    pagibig: Number(row.pagibig),
    philhealth: Number(row.philhealth),
    vul: Number(row.vul),
    emergencyFund: Number(row.emergency_fund ?? 0),
    generalSavings: Number(row.general_savings ?? 0),
    paidBills: Array.isArray(row.paid_bills) && row.paid_bills.length > 0 ? row.paid_bills : undefined,
  };
}

function fromExpenseRow(row: {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
}): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category as Expense['category'],
    amount: Number(row.amount),
    description: row.description ?? '',
  };
}

export type IdMapping = {
  income: Array<{ oldId: string; newId: string }>;
  expenses: Array<{ oldId: string; newId: string }>;
  bills: Array<{ oldId: string; newId: string }>;
  billPayments: Array<{ oldId: string; newId: string }>;
};

export type SaveResult = {
  ok: boolean;
  error?: string;
  saved?: { income: number; expenses: number; bills: number; billPayments: number };
  /** When we assigned new UUIDs to legacy entries, use this to update local state so ids stay in sync. */
  idMapping?: IdMapping;
};

export async function saveFinancialDataToSupabase(data: FinancialData): Promise<SaveResult> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, error: 'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and restart the dev server.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in to save.' };
  }

  const userId = user.id;

  try {
    const idMapping: IdMapping = { income: [], expenses: [], bills: [], billPayments: [] };

    const incomeRows = data.incomeHistory.map((entry) => {
      const id = isValidUUID(entry.id) ? entry.id : crypto.randomUUID();
      if (id !== entry.id) idMapping.income.push({ oldId: entry.id, newId: id });
      return toIncomeRow(entry, id, userId);
    });

    const expenseRows = data.expenses.map((expense) => {
      const id = isValidUUID(expense.id) ? expense.id : crypto.randomUUID();
      if (id !== expense.id) idMapping.expenses.push({ oldId: expense.id, newId: id });
      return toExpenseRow(expense, id, userId);
    });

    const billRows = (data.bills ?? []).map((bill) => {
      const id = isValidUUID(bill.id) ? bill.id : crypto.randomUUID();
      if (id !== bill.id) idMapping.bills.push({ oldId: bill.id, newId: id });
      return toBillRow(bill, id, userId);
    });

    const billIdRemap = new Map(idMapping.bills.map(m => [m.oldId, m.newId]));
    const billPaymentRows = (data.billPayments ?? []).map((payment) => {
      const id = isValidUUID(payment.id) ? payment.id : crypto.randomUUID();
      if (id !== payment.id) idMapping.billPayments.push({ oldId: payment.id, newId: id });
      const billId = billIdRemap.get(payment.billId) ?? payment.billId;
      return toBillPaymentRow({ ...payment, billId }, id, userId);
    });

    const totalToSave = incomeRows.length + expenseRows.length + billRows.length + billPaymentRows.length;
    if (totalToSave === 0) {
      return { ok: true, saved: { income: 0, expenses: 0, bills: 0, billPayments: 0 } };
    }

    if (incomeRows.length > 0) {
      const { error: incomeError } = await supabase
        .from('income_history')
        .upsert(incomeRows, { onConflict: 'id' });
      if (incomeError) return { ok: false, error: incomeError.message };
    }

    if (expenseRows.length > 0) {
      const { error: expenseError } = await supabase
        .from('expenses')
        .upsert(expenseRows, { onConflict: 'id' });
      if (expenseError) return { ok: false, error: expenseError.message };
    }

    if (billRows.length > 0) {
      const { error: billError } = await supabase
        .from('bills')
        .upsert(billRows, { onConflict: 'id' });
      if (billError) return { ok: false, error: billError.message };
    }

    if (billPaymentRows.length > 0) {
      const { error: paymentError } = await supabase
        .from('bill_payments')
        .upsert(billPaymentRows, { onConflict: 'id' });
      if (paymentError) return { ok: false, error: paymentError.message };
    }

    const hasMapping =
      idMapping.income.length > 0 ||
      idMapping.expenses.length > 0 ||
      idMapping.bills.length > 0 ||
      idMapping.billPayments.length > 0;
    return {
      ok: true,
      saved: {
        income: incomeRows.length,
        expenses: expenseRows.length,
        bills: billRows.length,
        billPayments: billPaymentRows.length,
      },
      idMapping: hasMapping ? idMapping : undefined,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Permanently remove a bill (and its payments) from Supabase.
 * The autosave path only upserts, so a delete in the UI would otherwise
 * reappear on the next load. Local-only bills (non-UUID ids never persisted)
 * are a no-op.
 */
export async function deleteBillFromSupabase(billId: string): Promise<{ ok: boolean; error?: string }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, error: 'Missing Supabase config.' };
  }

  // Never saved to Supabase — nothing to delete remotely.
  if (!isValidUUID(billId)) {
    return { ok: true };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in to delete.' };
  }

  try {
    // Remove payments first (no FK cascade assumed), then the bill.
    const { error: paymentsError } = await supabase
      .from('bill_payments')
      .delete()
      .eq('bill_id', billId);
    if (paymentsError) return { ok: false, error: paymentsError.message };

    const { error: billError } = await supabase
      .from('bills')
      .delete()
      .eq('id', billId);
    if (billError) return { ok: false, error: billError.message };

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Permanently remove an income entry from Supabase.
 * Like bills, the autosave path only upserts, so a delete in the UI would
 * otherwise reappear on the next load. Local-only entries (non-UUID ids that
 * were never persisted) are a no-op.
 */
export async function deleteIncomeFromSupabase(incomeId: string): Promise<{ ok: boolean; error?: string }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, error: 'Missing Supabase config.' };
  }

  // Never saved to Supabase — nothing to delete remotely.
  if (!isValidUUID(incomeId)) {
    return { ok: true };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in to delete.' };
  }

  try {
    const { error } = await supabase
      .from('income_history')
      .delete()
      .eq('id', incomeId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Permanently remove an expense from Supabase. Same rationale as
 * {@link deleteIncomeFromSupabase} — autosave only upserts.
 */
export async function deleteExpenseFromSupabase(expenseId: string): Promise<{ ok: boolean; error?: string }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, error: 'Missing Supabase config.' };
  }

  if (!isValidUUID(expenseId)) {
    return { ok: true };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in to delete.' };
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export type LoadResult = { ok: true; data: FinancialData } | { ok: false; error: string };

/** Load income and expenses for the current user from Supabase (RLS filters by auth.uid()). */
export async function loadFinancialDataFromSupabase(): Promise<LoadResult> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, error: 'Missing Supabase config.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in to load data.' };
  }

  try {
    const [incomeRes, expenseRes, billsRes, paymentsRes] = await Promise.all([
      supabase.from('income_history').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('bills').select('*').order('due_date', { ascending: true }),
      supabase.from('bill_payments').select('*').order('paid_date', { ascending: false }),
    ]);

    if (incomeRes.error) return { ok: false, error: incomeRes.error.message };
    if (expenseRes.error) return { ok: false, error: expenseRes.error.message };
    // Bills / payments tables may not exist yet — treat as empty
    const bills = billsRes.error ? [] : (billsRes.data ?? []).map(fromBillRow).filter(b => b.active);
    const billPayments = paymentsRes.error ? [] : (paymentsRes.data ?? []).map(fromBillPaymentRow);

    const incomeHistory = (incomeRes.data ?? []).map(fromIncomeRow);
    const expenses = (expenseRes.data ?? []).map(fromExpenseRow);

    return {
      ok: true,
      data: { incomeHistory, expenses, bills, billPayments },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
