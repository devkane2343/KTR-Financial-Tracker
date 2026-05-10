
import React, { useMemo, useState } from 'react';
import { FinancialData } from '../types';
import { formatCurrency, isSavingsCategory, getMonthlyIncomeTotals } from '../lib/utils';
import { TrendingUp, Wallet, CreditCard, BarChart3, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface AnalyticsSummaryProps {
  data: FinancialData;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ data }) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  const {
    dateRange,
    monthlyGrossIncome,
    monthlyNetIncome,
    monthlyExpenses,
    monthlyNetBalance,
    monthlySavings,
    savingsUsed,
    monthPeriod,
    monthLabel,
    sortedMonths,
    incomeCountForMonth,
    expenseCountForMonth,
  } = useMemo(() => {
    const allDates: Date[] = [];
    data.incomeHistory.forEach(inc => {
      const [y, m, d] = inc.date.split('-').map(Number);
      allDates.push(new Date(y, m - 1, d));
    });
    data.expenses.forEach(exp => {
      const [y, m, d] = exp.date.split('-').map(Number);
      allDates.push(new Date(y, m - 1, d));
    });

    let dateRange = 'No data yet';
    if (allDates.length > 0) {
      const earliest = new Date(Math.min(...allDates.map(d => d.getTime())));
      const latest = new Date(Math.max(...allDates.map(d => d.getTime())));
      const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dateRange = earliest.getTime() === latest.getTime() ? formatDate(earliest) : `${formatDate(earliest)} – ${formatDate(latest)}`;
    }

    let monthPeriod = 'No data';
    let monthLabel = '—';
    let monthlyGrossIncome = 0;
    let monthlyNetIncome = 0;
    let monthlyExpenses = 0;
    let monthlyNetBalance = 0;
    let monthlySavings = 0;
    let savingsUsed = 0;
    let incomeCountForMonth = 0;
    let expenseCountForMonth = 0;
    let sortedMonths: string[] = [];

    const monthlyIncomeMap = getMonthlyIncomeTotals(data.incomeHistory);
    const monthsSet = new Set<string>(monthlyIncomeMap.keys());
    data.expenses.forEach(exp => {
      const [y, m] = exp.date.split('-').map(Number);
      monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
    });

    if (monthsSet.size > 0) {
      sortedMonths = Array.from(monthsSet).sort();
      const monthIndex = Math.min(selectedMonthIndex, sortedMonths.length - 1);
      const selectedMonth = sortedMonths[sortedMonths.length - 1 - monthIndex];
      const incomeTotals = monthlyIncomeMap.get(selectedMonth);

      const selectedMonthExpenses = data.expenses.filter(exp => {
        const [y, m] = exp.date.split('-').map(Number);
        return `${y}-${String(m).padStart(2, '0')}` === selectedMonth;
      });

      monthlyGrossIncome = incomeTotals?.grossIncome ?? 0;
      monthlyNetIncome = incomeTotals?.netIncome ?? 0;
      incomeCountForMonth = Math.round(incomeTotals?.entryCount ?? 0);

      monthlyExpenses = selectedMonthExpenses
        .filter(exp => !isSavingsCategory(exp.category))
        .reduce((sum, exp) => sum + exp.amount, 0);

      const savingsFromIncome = (incomeTotals?.emergencyFund ?? 0) + (incomeTotals?.generalSavings ?? 0);
      const savingsFromExpenses = selectedMonthExpenses
        .filter(exp => isSavingsCategory(exp.category))
        .reduce((sum, exp) => sum + exp.amount, 0);
      monthlySavings = savingsFromIncome + savingsFromExpenses;

      const rawBalance = monthlyNetIncome - monthlyExpenses;
      if (rawBalance < 0) {
        savingsUsed = Math.min(Math.abs(rawBalance), monthlySavings);
        monthlyNetBalance = rawBalance + savingsUsed;
      } else {
        savingsUsed = 0;
        monthlyNetBalance = rawBalance;
      }

      expenseCountForMonth = selectedMonthExpenses.filter(exp => !isSavingsCategory(exp.category)).length;

      const [y, m] = selectedMonth.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      monthPeriod = `${fmt(firstDay)} — ${fmt(lastDay)}`;
      monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    return {
      dateRange,
      monthlyGrossIncome,
      monthlyNetIncome,
      monthlyExpenses,
      monthlyNetBalance,
      monthlySavings,
      savingsUsed,
      monthPeriod,
      monthLabel,
      sortedMonths,
      incomeCountForMonth,
      expenseCountForMonth,
    };
  }, [data, selectedMonthIndex]);

  const averageNetIncomeForMonth = incomeCountForMonth > 0 ? monthlyNetIncome / incomeCountForMonth : 0;
  const savingsRate = monthlyGrossIncome > 0 ? Math.max(0, Math.min(1, monthlySavings / monthlyGrossIncome)) : 0;
  const savingsRatePct = Math.round(savingsRate * 100);

  // Health score: weighted blend of (savings rate, surplus presence, expense discipline)
  const expenseRatio = monthlyNetIncome > 0 ? monthlyExpenses / monthlyNetIncome : 1;
  const expenseScore = Math.max(0, Math.min(1, 1 - expenseRatio)); // 1 if expenses=0, 0 if expenses=net
  const surplusScore = monthlyNetBalance >= 0 ? 1 : 0;
  const healthScore = Math.round((savingsRate * 0.45 + expenseScore * 0.35 + surplusScore * 0.20) * 100);
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Strong' : healthScore >= 40 ? 'Steady' : healthScore >= 20 ? 'Tightening' : 'Strained';
  const healthAccent = healthScore >= 60 ? 'jade' : healthScore >= 40 ? 'gold' : 'coral';

  const ringCircumference = 2 * Math.PI * 36;
  const ringOffset = ringCircumference * (1 - savingsRate);

  return (
    <div className="space-y-4">
      {/* Month banner */}
      <div className="bg-paper rounded-xl border border-rule p-5 sm:p-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted mb-1">Selected month</p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight leading-none">{monthLabel}</h2>
          <p className="font-mono text-[11px] text-ink-muted mt-2">{monthPeriod}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-ink-muted mb-0.5">Archive</p>
            <p className="font-mono text-xs text-ink-soft">{dateRange}</p>
          </div>
          {sortedMonths.length > 1 && (
            <div className="flex items-center gap-0.5 ml-2 border border-rule rounded-lg p-0.5">
              <button
                onClick={() => setSelectedMonthIndex(prev => Math.min(prev + 1, sortedMonths.length - 1))}
                disabled={selectedMonthIndex >= sortedMonths.length - 1}
                className="p-1.5 rounded-md hover:bg-paper-soft disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="Earlier month"
              >
                <ChevronLeft className="w-4 h-4 text-ink" />
              </button>
              <span className="font-mono text-[10px] text-ink-muted px-1.5 select-none">
                {sortedMonths.length - selectedMonthIndex}/{sortedMonths.length}
              </span>
              <button
                onClick={() => setSelectedMonthIndex(prev => Math.max(prev - 1, 0))}
                disabled={selectedMonthIndex <= 0}
                className="p-1.5 rounded-md hover:bg-paper-soft disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="Later month"
              >
                <ChevronRight className="w-4 h-4 text-ink" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Featured: Monthly Gross Income */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 relative bg-ink text-paper rounded-xl p-6 sm:p-7 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs uppercase tracking-wider text-paper/55">Gross income this month</p>
            <div className="flex items-center gap-1.5 text-paper/55 text-xs font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{incomeCountForMonth} {incomeCountForMonth === 1 ? 'paycheck' : 'paychecks'}</span>
            </div>
          </div>
          <p className="num font-semibold text-4xl sm:text-5xl tracking-tight text-paper animate-count-pop">
            {formatCurrency(monthlyGrossIncome)}
          </p>
          <div className="flex items-baseline gap-6 mt-5 pt-4 border-t border-paper/10">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-paper/45 mb-0.5">Net after deductions</p>
              <p className="num text-base text-paper">{formatCurrency(monthlyNetIncome)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-paper/45 mb-0.5">Avg per paycheck</p>
              <p className="num text-base text-paper">{formatCurrency(averageNetIncomeForMonth)}</p>
            </div>
          </div>
        </div>

        {/* Health Score + Savings Ring */}
        <div className="lg:col-span-5 bg-paper rounded-xl p-6 border border-rule">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-ink-muted mb-1">Discipline score</p>
              <h3 className="font-display text-3xl text-ink tracking-tight leading-none">{healthScore}<span className="text-ink-whisper text-lg font-normal">/100</span></h3>
              <p className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium ${
                healthAccent === 'jade' ? 'text-jade-600' : healthAccent === 'gold' ? 'text-gold-600' : 'text-coral-600'
              }`}>
                <Sparkles className="w-3 h-3" /> {healthLabel}
              </p>
            </div>
            <div className="relative w-[88px] h-[88px]">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeOpacity="0.12" className="text-ink" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="36"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="num text-lg font-semibold text-ink leading-none">{savingsRatePct}%</p>
                <p className="text-[9px] uppercase tracking-wider text-ink-muted mt-0.5">Saved</p>
              </div>
            </div>
          </div>

          <div className="hairline my-3" />

          <p className="text-xs text-ink-muted leading-relaxed">
            {savingsRatePct >= 20
              ? `Excellent — you set aside ${formatCurrency(monthlySavings)} this month.`
              : savingsRatePct >= 10
              ? `Steady. ${formatCurrency(monthlySavings)} put away. Aim for 20% next month.`
              : monthlySavings > 0
              ? `${formatCurrency(monthlySavings)} saved. Push harder — the goal is 20% of gross.`
              : `Nothing saved this month. Even 5% compounds. Start small.`}
          </p>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-paper rounded-xl p-5 border border-rule">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-ink-muted">Avg net income</p>
            <BarChart3 className="w-4 h-4 text-ink-whisper" />
          </div>
          <p className="num text-2xl text-ink font-semibold">{formatCurrency(averageNetIncomeForMonth)}</p>
          <p className="text-xs text-ink-muted mt-1">{incomeCountForMonth} {incomeCountForMonth === 1 ? 'paycheck' : 'paychecks'}</p>
        </div>

        <div className="bg-paper rounded-xl p-5 border border-rule">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-ink-muted">Total expenses</p>
            <CreditCard className="w-4 h-4 text-ink-whisper" />
          </div>
          <p className="num text-2xl text-ink font-semibold">{formatCurrency(monthlyExpenses)}</p>
          <p className="text-xs text-ink-muted mt-1">{expenseCountForMonth} {expenseCountForMonth === 1 ? 'transaction' : 'transactions'}</p>
        </div>

        <div className={`rounded-xl p-5 border ${
          monthlyNetBalance >= 0
            ? 'bg-jade-50/60 border-jade-100 dark:bg-jade-900/30 dark:border-jade-800'
            : 'bg-coral-50/60 border-coral-100 dark:bg-coral-500/10 dark:border-coral-500/30'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-ink-muted">Net balance</p>
            <Wallet className={`w-4 h-4 ${monthlyNetBalance >= 0 ? 'text-jade-600 dark:text-jade-400' : 'text-coral-600 dark:text-coral-400'}`} />
          </div>
          <p className={`num text-2xl font-semibold ${monthlyNetBalance >= 0 ? 'text-jade-700 dark:text-jade-300' : 'text-coral-600 dark:text-coral-400'}`}>
            {monthlyNetBalance >= 0 ? '+' : ''}{formatCurrency(monthlyNetBalance)}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {savingsUsed > 0
              ? `${formatCurrency(savingsUsed)} drawn from savings`
              : monthlyNetBalance >= 0 ? 'Surplus — save it' : 'Deficit'}
          </p>
        </div>
      </div>
    </div>
  );
};
