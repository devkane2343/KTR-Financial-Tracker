
import React, { useState } from 'react';
import { FinancialData, Category } from '../types';
import { formatCurrency, getNetIncome, getDeductionsForEntry } from '../lib/utils';
import { TrendingUp, Wallet, PiggyBank, Receipt, Banknote, CreditCard, Info } from 'lucide-react';

interface SummaryCardsProps {
  data: FinancialData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const { incomeHistory, expenses } = data;
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const lifetimeEarnings = incomeHistory.reduce((sum, inc) => sum + (inc.weeklySalary || 0), 0);
  const totalNetIncome = incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalDeductions = incomeHistory.reduce((sum, inc) => sum + getDeductionsForEntry(inc), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Total Savings = Emergency Fund + General Savings from salary deductions + savings expenses
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
  const totalSavings = savingsFromIncome + savingsFromExpenses;

  const currentBalance = totalNetIncome - totalExpenses;

  const cards = [
    {
      label: 'Lifetime Earnings',
      value: formatCurrency(lifetimeEarnings),
      icon: <Banknote className="w-5 h-5" />,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      formula: 'Sum of all Weekly Salaries',
      details: `∑ Weekly Salary = ${formatCurrency(lifetimeEarnings)}`
    },
    {
      label: 'Wallet Balance',
      value: formatCurrency(currentBalance),
      icon: <Wallet className="w-5 h-5" />,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      formula: 'Total Net Income - Total Expenses',
      details: `${formatCurrency(totalNetIncome)} - ${formatCurrency(totalExpenses)} = ${formatCurrency(currentBalance)}`
    },
    {
      label: 'Total Savings',
      value: formatCurrency(totalSavings),
      icon: <PiggyBank className="w-5 h-5" />,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      formula: 'Savings from Income + Savings Expenses',
      details: `${formatCurrency(savingsFromIncome)} + ${formatCurrency(savingsFromExpenses)} = ${formatCurrency(totalSavings)}\n\nIncludes: Emergency Fund & General Savings from both income deductions and expense entries`
    },
    {
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      icon: <CreditCard className="w-5 h-5" />,
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      formula: 'Sum of all Expense Amounts',
      details: `∑ All Expenses = ${formatCurrency(totalExpenses)}`
    },
    {
      label: 'Total Net Income',
      value: formatCurrency(totalNetIncome),
      icon: <TrendingUp className="w-5 h-5" />,
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      formula: '∑ (Weekly Salary - Deductions)',
      details: `For each income entry:\nNet = Weekly Salary - (SSS + Pag-IBIG + PhilHealth + VUL + Emergency Fund + General Savings)\n\nTotal Net Income = ${formatCurrency(totalNetIncome)}`
    },
    {
      label: 'Lifetime Deductions',
      value: formatCurrency(totalDeductions),
      icon: <Receipt className="w-5 h-5" />,
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      formula: '∑ (SSS + Pag-IBIG + PhilHealth + VUL + EF + GS)',
      details: `Total Deductions = SSS + Pag-IBIG + PhilHealth + VUL + Emergency Fund + General Savings\n\nSum = ${formatCurrency(totalDeductions)}`
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className="relative bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 transition-all duration-200 hover:shadow-lg hover:border-slate-300 cursor-help group"
          onMouseEnter={() => setHoveredCard(idx)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className={`${card.bgColor} ${card.textColor} p-2.5 rounded-lg`}>
            {card.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
              <Info className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xl font-bold text-slate-900">{card.value}</p>
          </div>

          {/* Tooltip */}
          {hoveredCard === idx && (
            <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="absolute -top-2 left-6 w-4 h-4 bg-slate-900 border-l border-t border-slate-700 transform rotate-45"></div>
              <p className="font-bold text-sm mb-2 text-amber-400">Formula:</p>
              <p className="text-xs font-mono mb-3 text-slate-200">{card.formula}</p>
              <p className="font-bold text-sm mb-2 text-emerald-400">Calculation:</p>
              <p className="text-xs font-mono whitespace-pre-line text-slate-300">{card.details}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
