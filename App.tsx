import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { FinancialData, IncomeEntry, Expense, TabType } from './types';
import { SummaryCards } from './components/SummaryCards';
import { IncomeForm } from './components/IncomeForm';
import { IncomeList } from './components/IncomeList';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { AnalyticsSummary } from './components/AnalyticsSummary';
import { SpendingTrendChart } from './components/Charts/SpendingTrendChart';
import { CategoryPieChart } from './components/Charts/CategoryPieChart';
import { IncomeVsExpenseChart } from './components/Charts/IncomeVsExpenseChart';
import { 
  LayoutDashboard, 
  ReceiptText, 
  PieChart as ChartIcon, 
  History, 
  ChevronRight
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { saveFinancialDataToSupabase, loadFinancialDataFromSupabase } from './lib/supabaseSave';

const LOGO_URL = '/logo.png';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<FinancialData>({
    incomeHistory: [],
    expenses: [],
  });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccessCount, setSaveSuccessCount] = useState<{ income: number; expenses: number } | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authChecked || !user) {
      if (!user) setIsLoaded(false);
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
  }, [authChecked, user]);

  const handleAddIncome = (income: IncomeEntry) => {
    setData(prev => ({ ...prev, incomeHistory: [income, ...prev.incomeHistory] }));
  };

  const handleUpdateIncome = (income: IncomeEntry) => {
    setData(prev => ({
      ...prev,
      incomeHistory: prev.incomeHistory.map(item => item.id === income.id ? income : item)
    }));
    setEditingIncome(null);
  };

  const handleDeleteIncome = (id: string) => {
    if (editingIncome?.id === id) setEditingIncome(null);
    setData(prev => ({ ...prev, incomeHistory: prev.incomeHistory.filter(i => i.id !== id) }));
  };

  const handleAddExpense = (expense: Expense) => {
    setData(prev => ({ ...prev, expenses: [expense, ...prev.expenses] }));
  };

  const handleUpdateExpense = (expense: Expense) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === expense.id ? expense : e)
    }));
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (editingExpense?.id === id) setEditingExpense(null);
    setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  };

  const handleSaveToSupabase = async () => {
    setSaveStatus('saving');
    setSaveError('');
    const result = await saveFinancialDataToSupabase(data);
    if (result.ok) {
      setSaveError('');
      setSaveSuccessCount(result.saved);
      if (result.idMapping) {
        const mapIncome = new Map(result.idMapping.income.map((m) => [m.oldId, m.newId]));
        const mapExpense = new Map(result.idMapping.expenses.map((m) => [m.oldId, m.newId]));
        setData((prev) => ({
          incomeHistory: prev.incomeHistory.map((e) => (mapIncome.has(e.id) ? { ...e, id: mapIncome.get(e.id)! } : e)),
          expenses: prev.expenses.map((e) => (mapExpense.has(e.id) ? { ...e, id: mapExpense.get(e.id)! } : e)),
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
  };

  if (!authChecked || (user && !isLoaded)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">
            {!authChecked ? 'Checking auth…' : 'Loading your data…'}
          </p>
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
    { id: 'expenses', label: 'Expenses', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <ChartIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-12">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
            <div className="bg-slate-900 p-0.5 rounded-full shadow-lg overflow-hidden w-9 h-9 flex items-center justify-center transition-transform group-hover:rotate-180 duration-700">
              <img src={LOGO_URL} className="w-full h-full object-contain" alt="KTR Logo" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">KTR - Financial Tracker</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id 
                  ? 'bg-red-50 text-red-700' 
                  : 'text-slate-500 hover:text-red-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToSupabase}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
              title="Save to Supabase"
            >
              {saveStatus === 'saving' && (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving…</span>
                </>
              )}
              {saveStatus === 'success' && (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {saveSuccessCount && (saveSuccessCount.income > 0 || saveSuccessCount.expenses > 0)
                      ? `Saved ${saveSuccessCount.income} income, ${saveSuccessCount.expenses} expenses`
                      : 'Saved'}
                  </span>
                </>
              )}
              {(saveStatus === 'idle' || saveStatus === 'error') && (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save to cloud</span>
                </>
              )}
            </button>
            {saveStatus === 'error' && saveError && (
              <span className="flex items-center gap-1 text-xs text-red-600 max-w-[180px] sm:max-w-[280px] truncate" title={saveError}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {saveError}
              </span>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-slate-100 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden" title={user.email ?? undefined}>
              <img src={LOGO_URL} className="w-6 h-6 opacity-50" alt="KTR" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
              activeTab === item.id ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Financial Overview</h2>
              <SummaryCards data={data} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-3 space-y-6">
                 <div className="bg-gradient-to-br from-emerald-100 to-white rounded-xl p-6 text-slate-800 shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-2">Welcome Mr. Kane</h3>
                      <p className="text-slate-600 text-sm mb-4">Observe every flow of your currency with precision. Log your salary history to unlock full insights.</p>
                      <button 
                        onClick={() => setActiveTab('income')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                      >
                        Log Paycheck <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <img 
                      src={LOGO_URL} 
                      className="absolute -right-6 -bottom-6 w-40 h-40 opacity-10 rotate-12 pointer-events-none" 
                      alt="Watermark" 
                    />
                 </div>
                 <ExpenseForm
                   onAdd={handleAddExpense}
                   onUpdate={handleUpdateExpense}
                   editingExpense={editingExpense}
                   onCancelEdit={() => setEditingExpense(null)}
                 />
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
          </div>
        )}

        {/* Income View */}
        {activeTab === 'income' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="lg:col-span-3">
                <IncomeForm 
                  onAdd={handleAddIncome} 
                  onUpdate={handleUpdateIncome}
                  editingEntry={editingIncome}
                  onCancelEdit={() => setEditingIncome(null)}
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
        )}

        {/* Expenses View */}
        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
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
        )}

        {/* Analytics View */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 p-1 rounded-full w-8 h-8 flex items-center justify-center">
                <img src={LOGO_URL} className="w-6 h-6 invert" alt="Analytics Icon" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Visual Insights</h2>
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Summary</h3>
              <AnalyticsSummary data={data} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <NetIncomeTrendChart data={data} />
              <SpendingTrendChart expenses={data.expenses} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <CategoryPieChart expenses={data.expenses} />
              <IncomeVsExpenseChart data={data} />
            </div>
          </div>
        )}

      </main>

      <footer className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-200 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
           <img src={LOGO_URL} className="w-4 h-4 opacity-40" alt="Footer Logo" />
           <p className="text-sm text-slate-500 font-medium">PesoWise Finance Tracker</p>
        </div>
        <p className="text-xs text-slate-400">
           &bull; Secured with Supabase Auth &bull; Your data stays in your account &bull;
        </p>
      </footer>
    </div>
  );
};

export default App;
