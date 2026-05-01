import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import { FinancialData, IncomeEntry, Expense, Bill, BillPayment, TabType } from './types';
import { addMonths, generateId, isBillPaidOff } from './lib/utils';
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
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';

const AnalyticsView = lazy(() => import('./components/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
import {
  LayoutDashboard,
  ReceiptText,
  PieChart as ChartIcon,
  History,
  ChevronRight,
  Save,
  Check,
  AlertCircle,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Shield,
  Briefcase,
  Receipt
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { saveFinancialDataToSupabase, loadFinancialDataFromSupabase } from './lib/supabaseSave';
import { getProfilePictureUrl } from './lib/profilePicture';
import { isUserAdmin } from './lib/adminUtils';
import { usePrivacyNotice } from './hooks/usePrivacyNotice';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(0);

  const { shouldShow: showPrivacyNotice, handleAccept: handlePrivacyAccept } = usePrivacyNotice(user);

  const dataRef = useRef(data);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

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
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleUpdateIncome = useCallback((income: IncomeEntry) => {
    setData(prev => {
      const { bills, payments } = applyPaidBillsToBills(prev.bills, prev.billPayments, income.paidBills, income.date);
      return {
        ...prev,
        incomeHistory: prev.incomeHistory.map(item => item.id === income.id ? income : item),
        bills,
        billPayments: payments,
      };
    });
    setEditingIncome(null);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleDeleteIncome = useCallback((id: string) => {
    setEditingIncome(prev => prev?.id === id ? null : prev);
    setData(prev => ({ ...prev, incomeHistory: prev.incomeHistory.filter(i => i.id !== id) }));
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleAddExpense = useCallback((expense: Expense) => {
    setData(prev => ({ ...prev, expenses: [expense, ...prev.expenses] }));
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleUpdateExpense = useCallback((expense: Expense) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === expense.id ? expense : e)
    }));
    setEditingExpense(null);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleDeleteExpense = useCallback((id: string) => {
    setEditingExpense(prev => prev?.id === id ? null : prev);
    setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    scheduleAutoSave();
  }, [scheduleAutoSave]);

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
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handlePayBill = useCallback((bill: Bill, paidDate: string) => {
    setData(prev => {
      // Guard against double-payment for same dueDate
      if (prev.billPayments.some(p => p.billId === bill.id && p.dueDate === bill.dueDate)) {
        return prev;
      }
      // Guard against paying a finished loan
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
  }, [scheduleAutoSave]);

  const handleSaveToSupabase = () => {
    performSave(data);
  };

  const firstName = (user?.user_metadata?.full_name?.split(' ')[0]) ?? '';
  const greetingTime = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const HeroCard = (
    <div className="relative bg-paper rounded-3xl shadow-paper-lift overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-jade-50/70 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-gold-50/80 blur-3xl pointer-events-none" />
      <div className="relative p-8 lg:p-10">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-jade-500 animate-pulse-jade" />
          <p className="eyebrow">Volume I · The Personal Ledger</p>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl leading-[0.95] text-ink mb-4">
          {greetingTime}
          {firstName ? (
            <>
              ,<br />
              <em className="text-jade-500" style={{ fontStyle: 'italic' }}>{firstName}.</em>
            </>
          ) : (
            <em className="text-jade-500" style={{ fontStyle: 'italic' }}>.</em>
          )}
        </h1>
        <p className="text-ink-muted text-[15px] leading-relaxed max-w-md mb-6">
          Wealth is built quietly, in entries kept honestly. Log this week&rsquo;s pay, settle every bill on time, and watch the discipline compound.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('income')}
            className="group relative bg-ink text-paper px-5 py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-jade-500 transition-all duration-300 shadow-paper"
          >
            <span>Log this week&rsquo;s pay</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className="text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5 px-3 py-3"
          >
            <Receipt className="w-4 h-4" />
            <span className="border-b border-rule">Review bills</span>
          </button>
        </div>
      </div>
    </div>
  );

  const dashboardContent = useMemo(() => (
    <div className="space-y-10 animate-fade-up">
      {HeroCard}
      <div>
        <div className="flex items-baseline justify-between mb-5">
          <p className="eyebrow">The Ledger &middot; Lifetime</p>
          <span className="text-xs text-ink-whisper font-mono">&sum; since first entry</span>
        </div>
        <SummaryCards data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <ExpenseForm
            onAdd={handleAddExpense}
            onUpdate={handleUpdateExpense}
            editingExpense={editingExpense}
            onCancelEdit={() => setEditingExpense(null)}
          />
        </div>
        <div className="lg:col-span-8">
          <ExpenseList
            expenses={data.expenses}
            onDelete={handleDeleteExpense}
            onEdit={(exp) => {
              setEditingExpense(exp);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </div>
  ), [HeroCard, data, editingExpense, handleAddExpense, handleUpdateExpense, handleDeleteExpense]);

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
         />
         <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-slate-800 mb-2">Wealth Observation</h3>
              <p className="text-sm text-slate-500">Categorize your spending to see exactly where your power is going. Savings are your ultimate defense.</p>
            </div>
            <img src={LOGO_URL} className="absolute -right-2 -bottom-2 w-16 h-16 opacity-5 rotate-45" alt="Deco" />
         </div>
      </div>
      <div className="lg:col-span-9">
         <ExpenseList
           expenses={data.expenses}
           onDelete={handleDeleteExpense}
           onEdit={(exp) => {
             setEditingExpense(exp);
             window.scrollTo({ top: 0, behavior: 'smooth' });
           }}
         />
      </div>
    </div>
  ), [data.expenses, editingExpense, handleAddExpense, handleUpdateExpense, handleDeleteExpense]);

  const analyticsContent = useMemo(() => (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><span className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <AnalyticsView data={data} />
    </Suspense>
  ), [data]);

  const portfolioContent = useMemo(() => (
    <div className="max-w-4xl mx-auto">
      <PortfolioCard
        onEdit={() => setActiveTab('profile')}
        refreshTrigger={portfolioRefreshTrigger}
      />
    </div>
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

  const adminContent = useMemo(() => (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  ), []);

  if (!authChecked || (user && !isLoaded)) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center relative">
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-ink/15 border-t-jade-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-display italic text-2xl text-ink mb-1">
              {!authChecked ? 'Verifying' : 'Gathering'}
            </p>
            <p className="eyebrow">
              {!authChecked ? 'Your credentials' : 'Your ledger'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'income', label: 'Income', icon: <History className="w-4 h-4" /> },
    { id: 'bills', label: 'Bills', icon: <Receipt className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <ChartIcon className="w-4 h-4" /> },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase className="w-4 h-4" /> },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-paper pb-24 sm:pb-12 relative">
      {/* Privacy Notice Modal */}
      <PrivacyNoticeModal isOpen={showPrivacyNotice} onAccept={handlePrivacyAccept} />

      {/* Navigation Header */}
      <header className="bg-paper/80 backdrop-blur-md border-b border-rule sticky top-0 z-40">
        <div className="max-w-[92rem] mx-auto px-5 sm:px-8 lg:px-10 h-[68px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-jade-500/8 group-hover:bg-jade-500/15 transition-colors" />
              <img src={LOGO_URL} className="w-7 h-7 object-contain relative" alt="KTR" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-[17px] text-ink tracking-tight">KTR <em className="not-italic text-jade-500">/</em> Financial Journal</span>
              <span className="eyebrow text-[9px] mt-1">An ongoing record of discipline</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all ${
                    isActive
                      ? 'text-paper'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-ink rounded-full -z-0" />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBar />

            <button
              onClick={handleSaveToSupabase}
              disabled={saveStatus === 'saving'}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all overflow-hidden ${
                saveStatus === 'success'
                  ? 'bg-jade-50 text-jade-600 border border-jade-100'
                  : saveStatus === 'error'
                  ? 'bg-coral-50 text-coral-600 border border-coral-100'
                  : 'bg-ink/5 text-ink hover:bg-ink/10 border border-rule'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
              title="Save now (changes auto-save after 1.5s)"
            >
              {saveStatus === 'saving' && (
                <>
                  <span className="w-3.5 h-3.5 border-[1.5px] border-ink/30 border-t-jade-500 rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving</span>
                </>
              )}
              {saveStatus === 'success' && (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {saveSuccessCount && (saveSuccessCount.income > 0 || saveSuccessCount.expenses > 0)
                      ? `Filed ${saveSuccessCount.income}+${saveSuccessCount.expenses}`
                      : 'Filed'}
                  </span>
                </>
              )}
              {(saveStatus === 'idle' || saveStatus === 'error') && (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">File entry</span>
                </>
              )}
            </button>
            {saveStatus === 'error' && saveError && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-coral-500 max-w-[280px] truncate" title={saveError}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {saveError}
              </span>
            )}
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-ink/5 transition-all"
                title={user.email ?? undefined}
              >
                <div className="h-8 w-8 rounded-full bg-paper-soft border border-rule flex items-center justify-center overflow-hidden">
                  {getProfilePictureUrl(user) ? (
                    <img src={getProfilePictureUrl(user)!} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <span className="font-display text-sm text-ink">{(firstName || user.email || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-paper rounded-2xl shadow-paper-lift py-2 z-50 animate-fade-up overflow-hidden">
                  <div className="px-4 py-3 border-b border-rule">
                    <p className="font-display text-lg text-ink leading-tight">
                      {user?.user_metadata?.full_name || 'Reader'}
                    </p>
                    <p className="text-xs text-ink-muted font-mono truncate mt-0.5">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-ink/5 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-ink-muted" />
                    Profile &amp; portfolio
                  </button>

                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-coral-500 hover:bg-coral-50/60 transition-colors"
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 bg-ink/95 backdrop-blur-md text-paper rounded-full px-2 py-1.5 flex justify-around items-center z-50 shadow-paper-lift">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-full transition-all min-w-0 ${
              activeTab === item.id ? 'bg-paper/15 text-paper' : 'text-paper/55'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-medium tracking-wide truncate max-w-[58px]">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-[92rem] mx-auto px-5 sm:px-8 lg:px-10 py-10 relative">

        {/* Dashboard View */}
        <div className={activeTab === 'dashboard' ? 'space-y-8' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'dashboard'}>
          {dashboardContent}
        </div>

        {/* Income View */}
        <div className={activeTab === 'income' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'income'}>
          {incomeContent}
        </div>

        {/* Bills View */}
        <div className={activeTab === 'bills' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'bills'}>
          {billsContent}
        </div>

        {/* Expenses View */}
        <div className={activeTab === 'expenses' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'expenses'}>
          {expensesContent}
        </div>

        {/* Analytics View (lazy-loaded with recharts) */}
        <div className={activeTab === 'analytics' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'analytics'}>
          {analyticsContent}
        </div>

        {/* Portfolio View - Display/Showcase */}
        <div className={activeTab === 'portfolio' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'portfolio'}>
          {portfolioContent}
        </div>

        {/* Profile View - Settings & Editor */}
        <div className={activeTab === 'profile' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'profile'}>
          {profileContent}
        </div>

        {/* Admin View */}
        <div className={activeTab === 'admin' ? '' : 'invisible absolute left-0 right-0 h-0 overflow-hidden pointer-events-none'} aria-hidden={activeTab !== 'admin'}>
          {adminContent}
        </div>

      </main>

      <footer className="max-w-[92rem] mx-auto px-5 sm:px-8 lg:px-10 pt-12 pb-8 mt-16">
        <div className="hairline mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} className="w-4 h-4 opacity-50" alt="" />
            <p className="font-display text-sm text-ink">KTR <em className="not-italic text-jade-500">/</em> Financial Journal</p>
          </div>
          <p className="eyebrow text-[9px]">Encrypted &middot; Yours alone &middot; Built with discipline</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
