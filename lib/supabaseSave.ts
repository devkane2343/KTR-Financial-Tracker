import { supabase } from './supabase';
import { isValidUUID } from './utils';
import type { FinancialData, IncomeEntry, Expense } from '../types';

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

export type IdMapping = { income: Array<{ oldId: string; newId: string }>; expenses: Array<{ oldId: string; newId: string }> };

export type SaveResult = {
  ok: boolean;
  error?: string;
  saved?: { income: number; expenses: number };
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
    const idMapping: IdMapping = { income: [], expenses: [] };

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

    const totalToSave = incomeRows.length + expenseRows.length;
    if (totalToSave === 0) {
      return { ok: true, saved: { income: 0, expenses: 0 } };
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

    const hasMapping = idMapping.income.length > 0 || idMapping.expenses.length > 0;
    return {
      ok: true,
      saved: { income: incomeRows.length, expenses: expenseRows.length },
      idMapping: hasMapping ? idMapping : undefined,
    };
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
    const [incomeRes, expenseRes] = await Promise.all([
      supabase.from('income_history').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
    ]);

    if (incomeRes.error) return { ok: false, error: incomeRes.error.message };
    if (expenseRes.error) return { ok: false, error: expenseRes.error.message };

    const incomeHistory = (incomeRes.data ?? []).map(fromIncomeRow);
    const expenses = (expenseRes.data ?? []).map(fromExpenseRow);

    return {
      ok: true,
      data: { incomeHistory, expenses },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
