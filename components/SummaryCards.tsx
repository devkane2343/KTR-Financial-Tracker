
import React, { useState, useMemo } from 'react';
import { FinancialData, Category } from '../types';
import { formatCurrency, getNetIncome, isSavingsCategory } from '../lib/utils';
import { TrendingUp, PiggyBank, Banknote, CreditCard } from 'lucide-react';

interface SummaryCardsProps {
  data: FinancialData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const { incomeHistory, expenses } = data;
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const stats = useMemo(() => {
    const lifetimeEarnings = incomeHistory.reduce((sum, inc) => sum + (inc.weeklySalary || 0), 0);
    const totalNetIncome = incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
    const totalExpenses = expenses
      .filter(exp => !isSavingsCategory(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const savingsFromIncome = incomeHistory.reduce(
      (sum, inc) => sum + (inc.emergencyFund || 0) + (inc.generalSavings || 0), 0
    );
    const savingsFromExpenses = expenses
      .filter(e => e.category === Category.EmergencyFund || e.category === Category.GeneralSavings)
      .reduce((sum, e) => sum + e.amount, 0);
    const grossSavings = savingsFromIncome + savingsFromExpenses;

    // Per-month averages
    const monthsSet = new Set<string>();
    incomeHistory.forEach(inc => {
      const [y, m] = inc.date.split('-').map(Number);
      monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
    });
    expenses.forEach(exp => {
      const [y, m] = exp.date.split('-').map(Number);
      monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
    });
    const monthCount = Math.max(monthsSet.size, 1);

    let totalSavingsUsed = 0;
    Array.from(monthsSet).forEach(monthKey => {
      const mInc = incomeHistory.filter(inc => {
        const [y, m] = inc.date.split('-').map(Number);
        return `${y}-${String(m).padStart(2, '0')}` === monthKey;
      });
      const mExp = expenses.filter(exp => {
        const [y, m] = exp.date.split('-').map(Number);
        return `${y}-${String(m).padStart(2, '0')}` === monthKey;
      });
      const monthNet = mInc.reduce((sum, inc) => sum + getNetIncome(inc), 0);
      const monthSpend = mExp.filter(e => !isSavingsCategory(e.category)).reduce((s, e) => s + e.amount, 0);
      const monthSaved = mInc.reduce((s, i) => s + (i.emergencyFund || 0) + (i.generalSavings || 0), 0)
        + mExp.filter(e => isSavingsCategory(e.category)).reduce((s, e) => s + e.amount, 0);
      const rawBalance = monthNet - monthSpend;
      if (rawBalance < 0) totalSavingsUsed += Math.min(Math.abs(rawBalance), monthSaved);
    });

    const totalSavings = grossSavings - totalSavingsUsed;
    const savingsRate = totalNetIncome > 0 ? (grossSavings / totalNetIncome) * 100 : 0;
    const avgMonthlyNet = totalNetIncome / monthCount;
    const avgMonthlyExpenses = totalExpenses / monthCount;
    const paycheckCount = incomeHistory.length;
    const avgPerPaycheck = paycheckCount > 0 ? lifetimeEarnings / paycheckCount : 0;

    return {
      lifetimeEarnings, totalNetIncome, totalExpenses,
      totalSavings, grossSavings, totalSavingsUsed,
      savingsRate, avgMonthlyNet, avgMonthlyExpenses,
      paycheckCount, avgPerPaycheck, savingsFromIncome, savingsFromExpenses,
    };
  }, [incomeHistory, expenses]);

  const cards = [
    {
      label: 'Gross Earnings',
      value: formatCurrency(stats.lifetimeEarnings),
      secondary: `${stats.paycheckCount} paychecks · avg ${formatCurrency(stats.avgPerPaycheck)}`,
      icon: <Banknote className="w-4 h-4" />,
      tone: 'neutral',
      formula: '∑ Weekly Salary',
      details: `${stats.paycheckCount} paychecks\nAvg per paycheck: ${formatCurrency(stats.avgPerPaycheck)}\nTotal: ${formatCurrency(stats.lifetimeEarnings)}`,
    },
    {
      label: 'Total Net Income',
      value: formatCurrency(stats.totalNetIncome),
      secondary: `avg ${formatCurrency(stats.avgMonthlyNet)} / mo`,
      icon: <TrendingUp className="w-4 h-4" />,
      tone: 'jade',
      formula: '∑ (Salary − Deductions)',
      details: `Gross: ${formatCurrency(stats.lifetimeEarnings)}\nDeductions: −${formatCurrency(stats.lifetimeEarnings - stats.totalNetIncome)}\nNet: ${formatCurrency(stats.totalNetIncome)}`,
    },
    {
      label: 'Lifetime Expenses',
      value: formatCurrency(stats.totalExpenses),
      secondary: `avg ${formatCurrency(stats.avgMonthlyExpenses)} / mo`,
      icon: <CreditCard className="w-4 h-4" />,
      tone: 'coral',
      formula: '∑ Expenses (excl. savings)',
      details: `Total spent: ${formatCurrency(stats.totalExpenses)}\nAvg/month: ${formatCurrency(stats.avgMonthlyExpenses)}`,
    },
    {
      label: 'Total Savings',
      value: formatCurrency(stats.totalSavings),
      secondary: `${stats.savingsRate.toFixed(1)}% savings rate`,
      icon: <PiggyBank className="w-4 h-4" />,
      tone: 'jade',
      formula: 'Savings In − Used for Deficits',
      details: stats.totalSavingsUsed > 0
        ? `Set aside: ${formatCurrency(stats.grossSavings)}\nUsed to cover deficits: −${formatCurrency(stats.totalSavingsUsed)}\nNet savings: ${formatCurrency(stats.totalSavings)}`
        : `From income: ${formatCurrency(stats.savingsFromIncome)}\nFrom expenses: ${formatCurrency(stats.savingsFromExpenses)}\nTotal: ${formatCurrency(stats.totalSavings)}`,
    },
  ];

  const toneClasses: Record<string, { iconBg: string; bar: string }> = {
    neutral: { iconBg: 'bg-paper-soft text-ink-soft',                                         bar: 'bg-ink/10' },
    jade:    { iconBg: 'bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-400',     bar: 'bg-jade-500' },
    coral:   { iconBg: 'bg-coral-50 text-coral-600 dark:bg-coral-500/20 dark:text-coral-400', bar: 'bg-coral-500' },
  };

  // Compute relative bar widths (each card fills relative to the max value)
  const maxVal = Math.max(stats.lifetimeEarnings, stats.totalNetIncome, stats.totalExpenses, stats.totalSavings, 1);
  const rawVals = [stats.lifetimeEarnings, stats.totalNetIncome, stats.totalExpenses, stats.totalSavings];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, idx) => {
        const tones = toneClasses[card.tone];
        const isHovered = hoveredCard === idx;
        const barPct = Math.min(100, (rawVals[idx] / maxVal) * 100);

        return (
          <div
            key={idx}
            className="group relative bg-paper rounded-xl p-4 sm:p-5 border border-rule hover:border-ink/20 transition-colors cursor-help stagger animate-fade-up overflow-hidden"
            style={{ animationDelay: `${idx * 40}ms` }}
            onMouseEnter={() => setHoveredCard(idx)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Subtle fill bar at bottom */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-ink/5 w-full">
              <div
                className={`h-full ${tones.bar} transition-all duration-700 opacity-60`}
                style={{ width: `${barPct}%` }}
              />
            </div>

            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-ink-muted leading-tight">{card.label}</p>
              <div className={`${tones.iconBg} w-7 h-7 rounded-md flex items-center justify-center shrink-0 ml-2`}>
                {card.icon}
              </div>
            </div>

            <p className="num text-xl sm:text-2xl font-semibold tracking-tight leading-none text-ink">
              {card.value}
            </p>
            <p className="text-[11px] text-ink-muted mt-1.5 leading-tight">{card.secondary}</p>

            {isHovered && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-ink text-paper p-3.5 rounded-lg shadow-paper-lift animate-fade-in">
                <div className="absolute -top-1.5 left-6 w-3 h-3 bg-ink rotate-45" />
                <p className="text-[10px] uppercase tracking-wider text-paper/50 mb-1">Formula</p>
                <p className="text-xs font-mono mb-2.5 text-paper/90">{card.formula}</p>
                <p className="text-[10px] uppercase tracking-wider text-paper/50 mb-1">Breakdown</p>
                <p className="text-xs font-mono whitespace-pre-line text-paper/70 leading-relaxed">{card.details}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
