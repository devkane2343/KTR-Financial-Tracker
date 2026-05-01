
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
      kicker: 'I',
      value: formatCurrency(lifetimeEarnings),
      icon: <Banknote className="w-4 h-4" />,
      tone: 'gold',
      formula: 'Sum of all weekly salaries',
      details: `∑ Weekly Salary = ${formatCurrency(lifetimeEarnings)}`
    },
    {
      label: 'Wallet Balance',
      kicker: 'II',
      value: formatCurrency(currentBalance),
      icon: <Wallet className="w-4 h-4" />,
      tone: 'jade',
      formula: 'Net Income − Expenses',
      details: `${formatCurrency(totalNetIncome)} − ${formatCurrency(totalExpenses)} = ${formatCurrency(currentBalance)}`
    },
    {
      label: 'Total Savings',
      kicker: 'III',
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
      kicker: 'IV',
      value: formatCurrency(totalExpenses),
      icon: <CreditCard className="w-4 h-4" />,
      tone: 'coral',
      formula: 'Sum of all expenses (excl. savings)',
      details: `∑ Expenses (excl. Savings) = ${formatCurrency(totalExpenses)}`
    },
    {
      label: 'Total Net Income',
      kicker: 'V',
      value: formatCurrency(totalNetIncome),
      icon: <TrendingUp className="w-4 h-4" />,
      tone: 'jade',
      formula: '∑ (Weekly Salary − Deductions)',
      details: `Net = Salary − (SSS + Pag-IBIG + PhilHealth + VUL + EF + GS)\n\nTotal = ${formatCurrency(totalNetIncome)}`
    },
    {
      label: 'Lifetime Deductions',
      kicker: 'VI',
      value: formatCurrency(totalDeductions),
      icon: <Receipt className="w-4 h-4" />,
      tone: 'ink',
      formula: '∑ (SSS + Pag-IBIG + PhilHealth + VUL + EF + GS)',
      details: `Total Deductions = ${formatCurrency(totalDeductions)}`
    }
  ];

  const toneClasses = {
    gold: { iconBg: 'bg-gold-50 text-gold-600', accent: 'text-gold-600' },
    jade: { iconBg: 'bg-jade-50 text-jade-500', accent: 'text-jade-500' },
    coral: { iconBg: 'bg-coral-50 text-coral-500', accent: 'text-coral-500' },
    ink: { iconBg: 'bg-ink/8 text-ink-soft', accent: 'text-ink' },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const tones = toneClasses[card.tone as keyof typeof toneClasses];
        const isHovered = hoveredCard === idx;
        return (
          <div
            key={idx}
            className="group relative bg-paper rounded-2xl p-5 shadow-paper hover:shadow-paper-lift transition-all duration-300 cursor-help overflow-visible stagger animate-fade-up"
            style={{ animationDelay: `${idx * 70}ms` }}
            onMouseEnter={() => setHoveredCard(idx)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Top row: kicker + icon */}
            <div className="flex items-start justify-between mb-3">
              <span className="font-display text-[11px] font-medium text-ink-whisper tracking-[0.18em]">
                № {card.kicker}
              </span>
              <div className={`${tones.iconBg} w-8 h-8 rounded-full flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>

            {/* Label */}
            <p className="eyebrow mb-2">{card.label}</p>

            {/* Value */}
            <p className={`num text-[26px] font-medium tracking-tight text-ink leading-none transition-colors group-hover:${tones.accent}`}>
              {card.value}
            </p>

            {/* Tooltip */}
            {isHovered && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-ink text-paper p-4 rounded-xl shadow-paper-lift animate-fade-up">
                <div className="absolute -top-1.5 left-6 w-3 h-3 bg-ink rotate-45" />
                <p className="eyebrow text-gold-300 mb-1.5">Formula</p>
                <p className="text-xs font-mono mb-3 text-paper/85">{card.formula}</p>
                <p className="eyebrow text-jade-200 mb-1.5">Calculation</p>
                <p className="text-xs font-mono whitespace-pre-line text-paper/70 leading-relaxed">{card.details}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
