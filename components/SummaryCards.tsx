
import React, { useState } from 'react';
import { FinancialData, Category } from '../types';
import { formatCurrency, getNetIncome, getDeductionsForEntry, isSavingsCategory } from '../lib/utils';
import { TrendingUp, Wallet, PiggyBank, Banknote, CreditCard, Receipt } from 'lucide-react';

interface SummaryCardsProps {
  data: FinancialData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const { incomeHistory, expenses } = data;
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const lifetimeEarnings = incomeHistory.reduce((sum, inc) => sum + (inc.weeklySalary || 0), 0);
  const totalNetIncome = incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalDeductions = incomeHistory.reduce((sum, inc) => sum + getDeductionsForEntry(inc), 0);
  const totalExpenses = expenses
    .filter(exp => !isSavingsCategory(exp.category))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const savingsFromIncome = incomeHistory.reduce(
    (sum, inc) => sum + (inc.emergencyFund || 0) + (inc.generalSavings || 0),
    0
  );
  const savingsFromExpenses = expenses
    .filter(e =>
      e.category === Category.EmergencyFund ||
      e.category === Category.GeneralSavings
    )
    .reduce((sum, e) => sum + e.amount, 0);
  const grossSavings = savingsFromIncome + savingsFromExpenses;

  const monthsSet = new Set<string>();
  incomeHistory.forEach(inc => {
    const [y, m] = inc.date.split('-').map(Number);
    monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
  });
  expenses.forEach(exp => {
    const [y, m] = exp.date.split('-').map(Number);
    monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
  });

  let totalSavingsUsed = 0;
  Array.from(monthsSet).forEach(monthKey => {
    const monthIncome = incomeHistory.filter(inc => {
      const [y, m] = inc.date.split('-').map(Number);
      return `${y}-${String(m).padStart(2, '0')}` === monthKey;
    });
    const monthExpenses = expenses.filter(exp => {
      const [y, m] = exp.date.split('-').map(Number);
      return `${y}-${String(m).padStart(2, '0')}` === monthKey;
    });
    const monthNet = monthIncome.reduce((sum, inc) => sum + getNetIncome(inc), 0);
    const monthExp = monthExpenses
      .filter(exp => !isSavingsCategory(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);
    const monthSavingsFromIncome = monthIncome.reduce(
      (sum, inc) => sum + (inc.emergencyFund || 0) + (inc.generalSavings || 0), 0
    );
    const monthSavingsFromExpenses = monthExpenses
      .filter(exp => isSavingsCategory(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);
    const monthSavings = monthSavingsFromIncome + monthSavingsFromExpenses;
    const rawBalance = monthNet - monthExp;
    if (rawBalance < 0) {
      totalSavingsUsed += Math.min(Math.abs(rawBalance), monthSavings);
    }
  });

  const totalSavings = grossSavings - totalSavingsUsed;
  const currentBalance = totalNetIncome - totalExpenses;

  const cards = [
    {
      label: 'Lifetime Earnings',
      value: formatCurrency(lifetimeEarnings),
      icon: <Banknote className="w-4 h-4" />,
      tone: 'neutral',
      formula: 'Sum of all weekly salaries',
      details: `∑ Weekly Salary = ${formatCurrency(lifetimeEarnings)}`
    },
    {
      label: 'Wallet Balance',
      value: formatCurrency(currentBalance),
      icon: <Wallet className="w-4 h-4" />,
      tone: currentBalance >= 0 ? 'jade' : 'coral',
      formula: 'Net Income − Expenses',
      details: `${formatCurrency(totalNetIncome)} − ${formatCurrency(totalExpenses)} = ${formatCurrency(currentBalance)}`
    },
    {
      label: 'Total Savings',
      value: formatCurrency(totalSavings),
      icon: <PiggyBank className="w-4 h-4" />,
      tone: 'jade',
      formula: totalSavingsUsed > 0
        ? '(Savings In + Savings Expenses) − Used'
        : 'Savings In + Savings Expenses',
      details: totalSavingsUsed > 0
        ? `Gross: ${formatCurrency(savingsFromIncome)} + ${formatCurrency(savingsFromExpenses)} = ${formatCurrency(grossSavings)}\nUsed (deficit cover): −${formatCurrency(totalSavingsUsed)}\nRemaining: ${formatCurrency(totalSavings)}`
        : `${formatCurrency(savingsFromIncome)} + ${formatCurrency(savingsFromExpenses)} = ${formatCurrency(totalSavings)}`
    },
    {
      label: 'Lifetime Expenses',
      value: formatCurrency(totalExpenses),
      icon: <CreditCard className="w-4 h-4" />,
      tone: 'coral',
      formula: 'Sum of all expenses (excl. savings)',
      details: `∑ Expenses (excl. Savings) = ${formatCurrency(totalExpenses)}`
    },
    {
      label: 'Total Net Income',
      value: formatCurrency(totalNetIncome),
      icon: <TrendingUp className="w-4 h-4" />,
      tone: 'jade',
      formula: '∑ (Weekly Salary − Deductions)',
      details: `Net = Salary − (SSS + Pag-IBIG + PhilHealth + VUL + EF + GS)\n\nTotal = ${formatCurrency(totalNetIncome)}`
    },
    {
      label: 'Lifetime Deductions',
      value: formatCurrency(totalDeductions),
      icon: <Receipt className="w-4 h-4" />,
      tone: 'neutral',
      formula: '∑ (SSS + Pag-IBIG + PhilHealth + VUL + EF + GS)',
      details: `Total Deductions = ${formatCurrency(totalDeductions)}`
    }
  ];

  const toneClasses: Record<string, { iconBg: string; valueColor: string }> = {
    neutral: { iconBg: 'bg-paper-soft text-ink-soft', valueColor: 'text-ink' },
    jade:    { iconBg: 'bg-jade-50 text-jade-600',    valueColor: 'text-ink' },
    coral:   { iconBg: 'bg-coral-50 text-coral-600',  valueColor: 'text-ink' },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card, idx) => {
        const tones = toneClasses[card.tone];
        const isHovered = hoveredCard === idx;
        return (
          <div
            key={idx}
            className="group relative bg-paper rounded-xl p-5 border border-rule hover:border-ink/15 transition-colors cursor-help stagger animate-fade-up"
            style={{ animationDelay: `${idx * 40}ms` }}
            onMouseEnter={() => setHoveredCard(idx)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-ink-muted">{card.label}</p>
              <div className={`${tones.iconBg} w-7 h-7 rounded-md flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>

            <p className={`num text-2xl font-semibold tracking-tight leading-none ${tones.valueColor}`}>
              {card.value}
            </p>

            {isHovered && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-ink text-paper p-3.5 rounded-lg shadow-paper-lift animate-fade-in">
                <div className="absolute -top-1.5 left-6 w-3 h-3 bg-ink rotate-45" />
                <p className="text-[10px] uppercase tracking-wider text-paper/50 mb-1">Formula</p>
                <p className="text-xs font-mono mb-2.5 text-paper/90">{card.formula}</p>
                <p className="text-[10px] uppercase tracking-wider text-paper/50 mb-1">Calculation</p>
                <p className="text-xs font-mono whitespace-pre-line text-paper/70 leading-relaxed">{card.details}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
