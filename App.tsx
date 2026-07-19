import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import { FinancialData, IncomeEntry, Expense, Bill, BillPayment, TabType, PayResult } from './types';
import { addMonths, generateId, getPaycheckTakeHome, isBillPaidOff, withBillExpenses } from './lib/utils';
import { SummaryCards } from './components/SummaryCards';
import { IncomeForm } from './components/IncomeForm';
import { IncomeList } from './components/IncomeList';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { AuthPage } from './components/AuthPage';
import { ProfilePage } from './components/ProfilePage';
import { PortfolioCard } from './components/PortfolioCard';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationBar } from './components/NotificationBar';
import { AdminGuard } from './components/AdminGuard';
import { BillForm } from './components/BillForm';
import { BillList } from './components/BillList';
import { NetWorthTab } from './components/NetWorthTab';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';

const AnalyticsView = lazy(() => import('./components/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const DashboardCharts = lazy(() => import('./components/DashboardCharts').then((m) => ({ default: m.DashboardCharts })));
import {
  LayoutDashboard,
  ReceiptText,
  PieChart as ChartIcon,
  History,
  ChevronRight,
  Check,
  AlertCircle,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Shield,
  Briefcase,
  Receipt,
  Wallet,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { saveFinancialDataToSupabase, loadFinancialDataFromSupabase, deleteBillFromSupabase, deleteIncomeFromSupabase, deleteExpenseFromSupabase } from './lib/supabaseSave';
import { getProfilePictureUrl } from './lib/profilePicture';
import { isUserAdmin } from './lib/adminUtils';
import { usePrivacyNotice } from './hooks/usePrivacyNotice';
import { useFundingSources } from './lib/useFundingSources';
import { backfillDebitFromPaychecks } from './lib/walletStore';

const LOGO_URL = '/logo.png';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<FinancialData>({
    incomeHistory: [],
    expenses: [],
    bills: [],
    billPayments: [],
  });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccessCount, setSaveSuccessCount] = useState<{ income: number; expenses: number } | undefined>(undefined);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      try { localStorage.setItem('ktr-theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const { shouldShow: showPrivacyNotice, handleAccept: handlePrivacyAccept } = usePrivacyNotice(user);

  // Liquid pots an expense can be funded from (Wallet, Debit, liquid savings,
  // liquid custom cards), plus the apply/reverse side-effects that deduct them.
  const { fundingSources, allPots, applySource, reverseSource, depositToDebit, withdrawFromDebit, buildWithdrawalRow, transfer } = useFundingSources(
    data.incomeHistory,
    data.expenses,
    // Re-pull balances whenever the user is on a tab that reads/moves them.
    // Income is included because logging a paycheck deposits its take-home to the
    // Debit balance — that needs the freshest stored value to add onto.
    activeTab === 'expenses' || activeTab === 'networth' || activeTab === 'income',
  );

  const dataRef = useRef(data);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Sliding indicator for the desktop nav — one pill that glides under the
  // active tab instead of each button toggling its own background.
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false });

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const performSave = useCallback(async (payload: FinancialData) => {
    setSaveStatus('saving');
    setSaveError('');
    const result = await saveFinancialDataToSupabase(payload);
    if (result.ok) {
      setSaveError('');
      setSaveSuccessCount(result.saved);
      if (result.idMapping) {
        const mapIncome = new Map(result.idMapping.income.map((m) => [m.oldId, m.newId]));
        const mapExpense = new Map(result.idMapping.expenses.map((m) => [m.oldId, m.newId]));
        const mapBills = new Map(result.idMapping.bills.map((m) => [m.oldId, m.newId]));
        const mapPayments = new Map(result.idMapping.billPayments.map((m) => [m.oldId, m.newId]));
        setData((prev) => ({
          incomeHistory: prev.incomeHistory.map((e) => (mapIncome.has(e.id) ? { ...e, id: mapIncome.get(e.id)! } : e)),
          expenses: prev.expenses.map((e) => (mapExpense.has(e.id) ? { ...e, id: mapExpense.get(e.id)! } : e)),
          bills: prev.bills.map((b) => (mapBills.has(b.id) ? { ...b, id: mapBills.get(b.id)! } : b)),
          billPayments: prev.billPayments.map((p) => {
            const newId = mapPayments.get(p.id);
            const newBillId = mapBills.get(p.billId);
            if (!newId && !newBillId) return p;
            return { ...p, id: newId ?? p.id, billId: newBillId ?? p.billId };
          }),
        }));
      }
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveSuccessCount(undefined);
      }, 3000);
    } else {
      setSaveStatus('error');
      setSaveError(result.error ?? 'Save failed');
    }
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveTimeoutRef.current = null;
      performSave(dataRef.current);
    }, 1500);
  }, [performSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mobile drawer: close on Escape, and lock body scroll while it's open so the
  // page behind the overlay doesn't scroll under the user's finger.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMobileMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobileMenuOpen]);

  // Measure the active tab button and slide the pill under it. Re-runs on tab
  // change, on admin-item toggle (changes the button set), and on resize (the
  // labels hide below `lg`, so widths shift). useLayoutEffect avoids a flash.
  useLayoutEffect(() => {
    const move = () => {
      const nav = navRef.current;
      const btn = tabRefs.current[activeTab];
      if (!nav || !btn) return;
      const navBox = nav.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      setPill({ left: btnBox.left - navBox.left, width: btnBox.width, ready: true });
    };
    move();
    window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [activeTab, isAdmin]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip token refreshes — they fire when returning to the tab and
      // would cause a full data reload + loading spinner flash.
      // All other events (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, etc.) pass through.
      if (event === 'TOKEN_REFRESHED') return;
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      isUserAdmin().then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (!authChecked || !userId) {
      if (!userId) setIsLoaded(false);
      return;
    }
    let cancelled = false;
    setIsLoaded(false);
    (async () => {
      const result = await loadFinancialDataFromSupabase();
      if (cancelled) return;
      if (result.ok) setData(result.data);
      setIsLoaded(true);

      // One-time reconciliation: paychecks logged before "salary lands on the
      // Debit Card" never credited Debit, so add their total take-home once.
      // Guarded server-side (debit_backfilled_at), so this is a no-op every load
      // after the first — safe to fire on every startup.
      if (result.ok) {
        const takeHomeTotal = result.data.incomeHistory.reduce((s, inc) => s + getPaycheckTakeHome(inc), 0);
        backfillDebitFromPaychecks(takeHomeTotal).then((res) => {
          if (!res.ok) {
            setSaveStatus('error');
            setSaveError(res.error ?? 'Failed to reconcile past paychecks to the Debit Card.');
          }
        });
      }
    })();
    return () => { cancelled = true; };
  }, [authChecked, userId]);

  const applyPaidBillsToBills = (
    bills: Bill[],
    payments: BillPayment[],
    paidBills: { billId: string }[] | undefined,
    paidOn: string,
  ): { bills: Bill[]; payments: BillPayment[] } => {
    if (!paidBills || paidBills.length === 0) return { bills, payments };
    const newPayments: BillPayment[] = [];
    const updatedBills = bills.map(bill => {
      const match = paidBills.find(pb => pb.billId === bill.id);
      if (!match) return bill;
      // Skip if a payment for this bill's current dueDate already exists, or loan is paid off
      if (payments.some(p => p.billId === bill.id && p.dueDate === bill.dueDate)) return bill;
      if (isBillPaidOff(bill, [...newPayments, ...payments])) return bill;
      newPayments.push({
        id: generateId(),
        billId: bill.id,
        dueDate: bill.dueDate,
        paidDate: paidOn,
        amount: bill.amount,
      });
      return { ...bill, dueDate: addMonths(bill.dueDate, 1) };
    });
    return { bills: updatedBills, payments: [...newPayments, ...payments] };
  };

  // Surface a deduction/refund failure without blocking the edit itself. Shared
  // by the income (Debit reconcile) and expense (funding source) handlers.
  const reportSourceError = useCallback((res: { ok: boolean; error?: string }) => {
    if (!res.ok) {
      setSaveStatus('error');
      setSaveError(res.error ?? 'Failed to update the funding source balance.');
    }
  }, []);

  const handleAddIncome = useCallback((income: IncomeEntry) => {
    setData(prev => {
      const { bills, payments } = applyPaidBillsToBills(prev.bills, prev.billPayments, income.paidBills, income.date);
      return {
        ...prev,
        incomeHistory: [income, ...prev.incomeHistory],
        bills,
        billPayments: payments,
      };
    });
    // Salary lands on the Debit Card: credit this paycheck's take-home there.
    depositToDebit(getPaycheckTakeHome(income)).then(reportSourceError);
    scheduleAutoSave();
  }, [scheduleAutoSave, depositToDebit, reportSourceError]);

  const handleUpdateIncome = useCallback((income: IncomeEntry) => {
    // Reconcile the Debit balance by the change in take-home. Captured from the
    // current render's history (edits are user-initiated, so this is fresh).
    const previousEntry = data.incomeHistory.find(item => item.id === income.id);
    const oldTakeHome = previousEntry ? getPaycheckTakeHome(previousEntry) : 0;
    setData(prev => {
      // Only apply bills that are newly checked on this edit. Re-applying the
      // full paidBills list would re-pay (and over-advance) bills this entry
      // already settled the first time around — which is what left bills like
      // Life Insurance stuck with a payment logged for their current dueDate.
      const previous = prev.incomeHistory.find(item => item.id === income.id);
      const alreadyPaid = new Set((previous?.paidBills ?? []).map(pb => pb.billId));
      const newlyPaid = (income.paidBills ?? []).filter(pb => !alreadyPaid.has(pb.billId));
      const { bills, payments } = applyPaidBillsToBills(prev.bills, prev.billPayments, newlyPaid, income.date);
      return {
        ...prev,
        incomeHistory: prev.incomeHistory.map(item => item.id === income.id ? income : item),
        bills,
        billPayments: payments,
      };
    });
    // Apply only the delta so the Debit balance tracks the edited take-home.
    const delta = getPaycheckTakeHome(income) - oldTakeHome;
    if (delta > 0) depositToDebit(delta).then(reportSourceError);
    else if (delta < 0) withdrawFromDebit(-delta).then(reportSourceError);
    setEditingIncome(null);
    scheduleAutoSave();
  }, [data.incomeHistory, scheduleAutoSave, depositToDebit, withdrawFromDebit, reportSourceError]);

  const handleDeleteIncome = useCallback((id: string) => {
    // Reverse the take-home this paycheck deposited on the Debit Card.
    const removed = data.incomeHistory.find(i => i.id === id);
    setEditingIncome(prev => prev?.id === id ? null : prev);
    setData(prev => ({ ...prev, incomeHistory: prev.incomeHistory.filter(i => i.id !== id) }));
    if (removed) withdrawFromDebit(getPaycheckTakeHome(removed)).then(reportSourceError);
    // Autosave only upserts, so we must explicitly delete the row from
    // Supabase — otherwise it reappears on the next load/refresh.
    deleteIncomeFromSupabase(id).then((res) => {
      if (!res.ok) {
        setSaveStatus('error');
        setSaveError(res.error ?? 'Failed to delete income');
      }
    });
    scheduleAutoSave();
  }, [data.incomeHistory, scheduleAutoSave, withdrawFromDebit, reportSourceError]);

  const handleAddExpense = useCallback((expense: Expense) => {
    // A savings-bucket source lowers a COMPUTED bucket via a paired negative
    // withdrawal row; Wallet/Debit/custom lower a STORED balance directly.
    const withdrawal = buildWithdrawalRow(expense);
    setData(prev => ({
      ...prev,
      expenses: withdrawal
        ? [withdrawal, expense, ...prev.expenses]
        : [expense, ...prev.expenses],
    }));
    if (expense.source) applySource(expense.source, expense.amount).then(reportSourceError);
    scheduleAutoSave();
  }, [scheduleAutoSave, buildWithdrawalRow, applySource, reportSourceError]);

  const handleUpdateExpense = useCallback((expense: Expense) => {
    // Read the pre-edit row via the ref (NOT inside the setData updater — that
    // runs twice under StrictMode, which would double-apply the balance change).
    const old = dataRef.current.expenses.find(e => e.id === expense.id);
    // Reverse the old stored-pot deduction, then apply the new one. Savings
    // sources are no-ops here (their effect is the withdrawal row, rebuilt below).
    if (old?.source) reverseSource(old.source, old.amount).then(reportSourceError);
    if (expense.source) applySource(expense.source, expense.amount).then(reportSourceError);

    // Drop any prior withdrawal row for this expense, then add a fresh one if
    // the (possibly changed) source is a savings bucket.
    const withdrawal = buildWithdrawalRow(expense);
    // A replaced/removed withdrawal row must be deleted from Supabase too.
    const oldWithdrawal = dataRef.current.expenses.find(e => e.savingsWithdrawalFor === expense.id);
    if (oldWithdrawal && oldWithdrawal.id !== withdrawal?.id) deleteExpenseFromSupabase(oldWithdrawal.id);

    setData(prev => {
      const withoutOldWithdrawal = prev.expenses.filter(e => e.savingsWithdrawalFor !== expense.id);
      const withUpdated = withoutOldWithdrawal.map(e => e.id === expense.id ? expense : e);
      return {
        ...prev,
        expenses: withdrawal ? [withdrawal, ...withUpdated] : withUpdated,
      };
    });
    setEditingExpense(null);
    scheduleAutoSave();
  }, [scheduleAutoSave, buildWithdrawalRow, applySource, reverseSource, reportSourceError]);

  const handleDeleteExpense = useCallback((id: string) => {
    setEditingExpense(prev => prev?.id === id ? null : prev);
    // The linked withdrawal row (if any) must be deleted from Supabase too.
    const removed = dataRef.current.expenses.find(e => e.id === id);
    const withdrawal = dataRef.current.expenses.find(e => e.savingsWithdrawalFor === id);
    if (removed?.source) reverseSource(removed.source, removed.amount).then(reportSourceError);

    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id && e.savingsWithdrawalFor !== id),
    }));
    // Autosave only upserts, so we must explicitly delete the row from
    // Supabase — otherwise it reappears on the next load/refresh.
    deleteExpenseFromSupabase(id).then((res) => {
      if (!res.ok) {
        setSaveStatus('error');
        setSaveError(res.error ?? 'Failed to delete expense');
      }
    });
    if (withdrawal) deleteExpenseFromSupabase(withdrawal.id);
    scheduleAutoSave();
  }, [scheduleAutoSave, reverseSource, reportSourceError]);

  // Move money between two of the user's own pots (bank-transfer-to-self). The
  // hook applies stored-pot balance changes + the audit log; any computed-bucket
  // legs come back as signed expense rows we add to data so buckets shift too.
  const handleTransfer = useCallback(
    async (from: Expense['source'], to: Expense['source'], amount: number, date: string, note?: string) => {
      if (!from || !to) return { ok: false, error: 'Pick both a source and a destination.' };
      const res = await transfer(from, to, amount, date, note);
      if (!res.ok) return { ok: false, error: res.error };
      if (res.expenseRows.length > 0) {
        setData(prev => ({ ...prev, expenses: [...res.expenseRows, ...prev.expenses] }));
        scheduleAutoSave();
      }
      return { ok: true };
    },
    [transfer, scheduleAutoSave],
  );

  const handleAddBill = useCallback((bill: Bill) => {
    setData(prev => ({ ...prev, bills: [bill, ...prev.bills] }));
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleUpdateBill = useCallback((bill: Bill) => {
    setData(prev => ({
      ...prev,
      bills: prev.bills.map(b => b.id === bill.id ? bill : b)
    }));
    setEditingBill(null);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleDeleteBill = useCallback((id: string) => {
    setEditingBill(prev => prev?.id === id ? null : prev);
    setData(prev => ({
      ...prev,
      bills: prev.bills.filter(b => b.id !== id),
      billPayments: prev.billPayments.filter(p => p.billId !== id),
    }));
    // Autosave only upserts, so we must explicitly delete the row from
    // Supabase — otherwise it reappears on the next load/refresh.
    deleteBillFromSupabase(id).then((res) => {
      if (!res.ok) {
        setSaveStatus('error');
        setSaveError(res.error ?? 'Failed to delete bill');
      }
    });
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handlePayBill = useCallback((bill: Bill, paidDate: string): PayResult => {
    // Decide the outcome up front so we can report it to the caller. The
    // guards below mirror the ones inside setData; without surfacing them the
    // Settle button was a silent no-op whenever a payment already existed for
    // the bill's current dueDate (e.g. after an income entry paid it).
    if (data.billPayments.some(p => p.billId === bill.id && p.dueDate === bill.dueDate)) {
      return 'already-paid';
    }
    if (isBillPaidOff(bill, data.billPayments)) {
      return 'paid-off';
    }
    setData(prev => {
      // Re-check against the latest state in case it changed since render.
      if (prev.billPayments.some(p => p.billId === bill.id && p.dueDate === bill.dueDate)) {
        return prev;
      }
      if (isBillPaidOff(bill, prev.billPayments)) {
        return prev;
      }
      const payment: BillPayment = {
        id: generateId(),
        billId: bill.id,
        dueDate: bill.dueDate,
        paidDate,
        amount: bill.amount,
      };
      return {
        ...prev,
        bills: prev.bills.map(b => b.id === bill.id ? { ...b, dueDate: addMonths(b.dueDate, 1) } : b),
        billPayments: [payment, ...prev.billPayments],
      };
    });
    scheduleAutoSave();
    return 'paid';
  }, [data.billPayments, scheduleAutoSave]);

  const firstName = (user?.user_metadata?.full_name?.split(' ')[0]) ?? '';
  const greetingTime = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const HeroCard = (
    <div className="relative bg-paper rounded-2xl border border-rule overflow-hidden">
      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-jade-500" />
          <p className="text-xs text-ink-muted">Overview</p>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink mb-3">
          {greetingTime}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="text-ink-muted text-sm sm:text-[15px] leading-relaxed max-w-lg mb-6">
          A quick look at where your money stands. Log this week&rsquo;s pay, settle bills, and keep the record clean.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('income')}
            className="group inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            <span>Log paycheck</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink bg-transparent hover:bg-paper-soft border border-rule px-4 py-2 rounded-lg transition-colors"
          >
            <Receipt className="w-4 h-4" />
            <span>Review bills</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Fold paid bills into expenses so lifetime totals and charts count them.
  // Bills/billPayments are preserved untouched for the upcoming-bills widget.
  const dashboardData = useMemo(() => withBillExpenses(data), [data]);

  const dashboardContent = useMemo(() => (
    <div className="space-y-8">
      {HeroCard}

      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-medium text-ink">Lifetime totals</h2>
          <span className="text-xs text-ink-muted font-mono">since first entry</span>
        </div>
        <SummaryCards data={dashboardData} />
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
        </div>
      }>
        <DashboardCharts data={dashboardData} onGoToBills={() => setActiveTab('bills')} />
      </Suspense>
    </div>
  ), [HeroCard, dashboardData]);

  const incomeContent = useMemo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       <div className="lg:col-span-3">
          <IncomeForm
            onAdd={handleAddIncome}
            onUpdate={handleUpdateIncome}
            editingEntry={editingIncome}
            onCancelEdit={() => setEditingIncome(null)}
            bills={data.bills}
            payments={data.billPayments}
          />
       </div>
       <div className="lg:col-span-9">
          <IncomeList
            history={data.incomeHistory}
            onDelete={handleDeleteIncome}
            onEdit={(entry) => {
              setEditingIncome(entry);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
       </div>
    </div>
  ), [data.incomeHistory, data.bills, data.billPayments, editingIncome, handleAddIncome, handleUpdateIncome, handleDeleteIncome]);

  const expensesContent = useMemo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-3">
         <ExpenseForm
           onAdd={handleAddExpense}
           onUpdate={handleUpdateExpense}
           editingExpense={editingExpense}
           onCancelEdit={() => setEditingExpense(null)}
           fundingSources={fundingSources}
         />
         <div className="mt-4 bg-paper p-5 rounded-2xl border border-rule">
            <h3 className="text-sm font-medium text-ink mb-1.5">Tip</h3>
            <p className="text-sm text-ink-muted leading-relaxed">Categorize spending to see where your money is going. Set savings aside first — every paycheck, every time.</p>
         </div>
      </div>
      <div className="lg:col-span-9">
         <ExpenseList
           expenses={dashboardData.expenses}
           onDelete={handleDeleteExpense}
           onEdit={(exp) => {
             setEditingExpense(exp);
             window.scrollTo({ top: 0, behavior: 'smooth' });
           }}
         />
      </div>
    </div>
  ), [dashboardData.expenses, editingExpense, handleAddExpense, handleUpdateExpense, handleDeleteExpense, fundingSources]);

  const analyticsContent = useMemo(() => (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><span className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin" /></div>}>
      <AnalyticsView data={data} />
    </Suspense>
  ), [data]);

  const portfolioContent = useMemo(() => (
    <PortfolioCard
      onEdit={() => setActiveTab('profile')}
      refreshTrigger={portfolioRefreshTrigger}
    />
  ), [portfolioRefreshTrigger, setActiveTab]);

  const profileContent = useMemo(() => (
    <ProfilePage
      user={user}
      onPortfolioSaved={() => setPortfolioRefreshTrigger(prev => prev + 1)}
    />
  ), [user]);

  const billsContent = useMemo(() => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-3">
        <BillForm
          onAdd={handleAddBill}
          onUpdate={handleUpdateBill}
          editingBill={editingBill}
          onCancelEdit={() => setEditingBill(null)}
        />
      </div>
      <div className="lg:col-span-9">
        <BillList
          bills={data.bills}
          payments={data.billPayments}
          onDelete={handleDeleteBill}
          onEdit={(bill) => {
            setEditingBill(bill);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPay={handlePayBill}
        />
      </div>
    </div>
  ), [data.bills, data.billPayments, editingBill, handleAddBill, handleUpdateBill, handleDeleteBill, handlePayBill]);

  const netWorthContent = useMemo(() => (
    <NetWorthTab
      data={data}
      active={activeTab === 'networth'}
      pots={allPots}
      onTransfer={handleTransfer}
    />
  ), [data, activeTab, allPots, handleTransfer]);

  const adminContent = useMemo(() => (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  ), []);

  if (!authChecked || (user && !isLoaded)) {
    return (
      <div className="min-h-screen bg-paper-soft flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-ink/15 border-t-ink rounded-full animate-spin"></div>
          <p className="text-sm text-ink-muted">
            {!authChecked ? 'Verifying credentials' : 'Loading your data'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Hidden panels are kept mounted (so lazy charts / wallet state survive) but
  // pulled out of flow. The active panel gets a fresh enter animation each
  // switch — keying the wrapper on `activeTab` restarts `tab-panel-active`.
  const HIDDEN_PANEL = 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none';
  const panelProps = (tab: TabType, activeClass = '') =>
    activeTab === tab
      ? { key: tab, className: `${activeClass} tab-panel-active`.trim(), 'aria-hidden': false as const }
      : { className: HIDDEN_PANEL, 'aria-hidden': true as const };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'income', label: 'Income', icon: <History className="w-4 h-4" /> },
    { id: 'bills', label: 'Bills', icon: <Receipt className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'networth', label: 'Net Worth', icon: <Wallet className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <ChartIcon className="w-4 h-4" /> },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase className="w-4 h-4" /> },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-paper-soft pb-28 md:pb-12 relative">
      {/* Privacy Notice Modal */}
      <PrivacyNoticeModal isOpen={showPrivacyNotice} onAccept={handlePrivacyAccept} />

      {/* Navigation Header */}
      <header className="bg-paper/85 backdrop-blur-md border-b border-rule sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Hamburger — mobile only. Opens the slide-out nav drawer. */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg hover:bg-paper-soft text-ink-soft hover:text-ink transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={LOGO_URL} className="w-full h-full object-contain" alt="Fintech" />
              </div>
              <span className="font-display text-[15px] text-ink tracking-tight hidden sm:inline">Fintech</span>
            </div>
          </div>

          <nav ref={navRef} className="relative hidden md:flex items-center gap-0.5 mx-auto bg-paper-soft/70 border border-rule rounded-lg p-1">
            {/* Sliding pill — glides under the active tab. */}
            <span
              aria-hidden="true"
              className={`absolute top-1 bottom-1 rounded-md bg-paper shadow-paper transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${pill.ready ? 'opacity-100' : 'opacity-0'}`}
              style={{ width: `${pill.width}px`, transform: `translateX(${pill.left}px)` }}
            />
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => { tabRefs.current[item.id] = el; }}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-200 ${
                    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <NotificationBar />

            {/* Auto-save status — passive (not clickable). Everything saves
                automatically after each change; this just reflects that state.
                Hidden while idle so it stays out of the way. */}
            {saveStatus !== 'idle' && (
              <span
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border ${
                  saveStatus === 'success'
                    ? 'bg-jade-50 text-jade-700 border-jade-100'
                    : saveStatus === 'error'
                    ? 'bg-coral-50 text-coral-600 border-coral-100'
                    : 'bg-paper text-ink-soft border-rule'
                }`}
                title={saveStatus === 'error' ? (saveError || 'Save failed') : 'Changes save automatically'}
              >
                {saveStatus === 'saving' && (
                  <>
                    <span className="w-3.5 h-3.5 border-[1.5px] border-ink/20 border-t-ink rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving</span>
                  </>
                )}
                {saveStatus === 'success' && (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {saveSuccessCount && (saveSuccessCount.income > 0 || saveSuccessCount.expenses > 0)
                        ? `Saved ${saveSuccessCount.income}+${saveSuccessCount.expenses}`
                        : 'Saved'}
                    </span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save failed</span>
                  </>
                )}
              </span>
            )}
            {saveStatus === 'error' && saveError && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-coral-500 max-w-[240px] truncate" title={saveError}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {saveError}
              </span>
            )}

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-lg hover:bg-paper-soft transition-colors"
                title={user.email ?? undefined}
              >
                <div className="h-7 w-7 rounded-full bg-paper-soft border border-rule flex items-center justify-center overflow-hidden">
                  {getProfilePictureUrl(user) ? (
                    <img src={getProfilePictureUrl(user)!} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <span className="text-xs font-medium text-ink">{(firstName || user.email || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-paper rounded-xl shadow-paper-lift py-1 z-50 animate-fade-up overflow-hidden border border-rule">
                  <div className="px-3 py-2.5 border-b border-rule">
                    <p className="text-sm font-medium text-ink leading-tight truncate">
                      {user?.user_metadata?.full_name || 'Account'}
                    </p>
                    <p className="text-xs text-ink-muted font-mono truncate mt-0.5">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-paper-soft transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-ink-muted" />
                    Profile &amp; portfolio
                  </button>

                  <div className="hairline my-1" />

                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-coral-600 hover:bg-coral-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation — all tabs stay visible; labels wrap rather
          than truncate so two-word items like "Net Worth" read in full even at
          360px with 8 items. Each cell keeps a >=48px tap target. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-paper/95 backdrop-blur-lg border-t border-rule px-1 pt-2 pb-1 safe-pb flex justify-around items-stretch z-50">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`relative flex flex-col items-center justify-start gap-0.5 flex-1 min-w-0 px-0.5 py-1.5 min-h-[48px] rounded-md transition-colors duration-200 ${
                isActive ? 'text-ink' : 'text-ink-muted'
              }`}
            >
              <span
                className={`flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? '-translate-y-0.5' : 'translate-y-0'}`}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] leading-[1.15] text-center transition-all duration-200 ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
              {/* Active indicator dot — fades/scales in under the active item.
                  top-0 (not -top-0.5) keeps it clear of the border with pt-2. */}
              <span
                aria-hidden="true"
                className={`absolute top-0 h-1 w-1 rounded-full bg-ink transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
              />
            </button>
          );
        })}
      </nav>

      {/* Mobile slide-out drawer — full navigation with roomy rows + account
          actions. Complements the bottom bar (quick access) with a legible,
          labelled menu. Mounted only while open so it doesn't trap focus/clicks. */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Panel — slides in from the left */}
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-paper border-r border-rule shadow-paper-lift flex flex-col animate-fade-up">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-rule shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={LOGO_URL} className="w-full h-full object-contain" alt="Fintech" />
                </div>
                <span className="font-display text-[15px] text-ink tracking-tight">Fintech</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-1 rounded-lg hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as TabType); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] ${
                      isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-soft hover:text-ink'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Account actions */}
            <div className="border-t border-rule p-3 space-y-1 shrink-0 safe-pb">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-ink leading-tight truncate">
                  {user.user_metadata?.full_name || 'Account'}
                </p>
                <p className="text-xs text-ink-muted font-mono truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-ink-soft hover:bg-paper-soft hover:text-ink transition-colors min-h-[48px]"
              >
                <UserIcon className="w-4 h-4 shrink-0 text-ink-muted" />
                Profile &amp; portfolio
              </button>
              <button
                onClick={() => { toggleTheme(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-ink-soft hover:bg-paper-soft hover:text-ink transition-colors min-h-[48px]"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0 text-ink-muted" /> : <Moon className="w-4 h-4 shrink-0 text-ink-muted" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                onClick={() => { supabase.auth.signOut(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-coral-600 hover:bg-coral-50 transition-colors min-h-[48px]"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative">

        {/* Dashboard View */}
        <div {...panelProps('dashboard', 'space-y-8')}>
          {dashboardContent}
        </div>

        {/* Income View */}
        <div {...panelProps('income')}>
          {incomeContent}
        </div>

        {/* Bills View */}
        <div {...panelProps('bills')}>
          {billsContent}
        </div>

        {/* Expenses View */}
        <div {...panelProps('expenses')}>
          {expensesContent}
        </div>

        {/* Net Worth View */}
        <div {...panelProps('networth')}>
          {netWorthContent}
        </div>

        {/* Analytics View (lazy-loaded with recharts) */}
        <div {...panelProps('analytics')}>
          {analyticsContent}
        </div>

        {/* Portfolio View - Display/Showcase */}
        <div {...panelProps('portfolio')}>
          {portfolioContent}
        </div>

        {/* Profile View - Settings & Editor */}
        <div {...panelProps('profile')}>
          {profileContent}
        </div>

        {/* Admin View */}
        <div {...panelProps('admin')}>
          {adminContent}
        </div>

      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 mt-12">
        <div className="hairline mb-5" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} className="w-5 h-5 rounded object-contain" alt="" />
            <p className="text-sm font-medium text-ink">Fintech</p>
          </div>
          <p className="text-xs text-ink-muted">Encrypted &middot; Private &middot; Yours alone</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
