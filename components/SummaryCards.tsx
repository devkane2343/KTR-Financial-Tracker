
import React from 'react';
import { FinancialData, Category } from '../types';
import { formatCurrency, getNetIncome, getDeductionsForEntry } from '../lib/utils';
import { TrendingUp, Wallet, PiggyBank, Receipt, Banknote, CreditCard } from 'lucide-react';

interface SummaryCardsProps {
  data: FinancialData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const { incomeHistory, expenses } = data;

  const lifetimeEarnings = incomeHistory.reduce((sum, inc) => sum + (inc.weeklySalary || 0), 0);
  const totalNetIncome = incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalDeductions = incomeHistory.reduce((sum, inc) => sum + getDeductionsForEntry(inc), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Total Savings = Emergency Fund + General Savings (per schema: expenses.category)
  const totalSavings = expenses
    .filter(e =>
      e.category === Category.EmergencyFund ||
      e.category === Category.GeneralSavings
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const currentBalance = totalNetIncome - totalExpenses;

  const cards = [
    {
      label: 'Lifetime Earnings',
      value: formatCurrency(lifetimeEarnings),
      icon: <Banknote className="w-5 h-5" />,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      label: 'Wallet Balance',
      value: formatCurrency(currentBalance),
      icon: <Wallet className="w-5 h-5" />,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Total Savings',
      value: formatCurrency(totalSavings),
      icon: <PiggyBank className="w-5 h-5" />,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      icon: <CreditCard className="w-5 h-5" />,
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Total Net Income',
      value: formatCurrency(totalNetIncome),
      icon: <TrendingUp className="w-5 h-5" />,
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'Lifetime Deductions',
      value: formatCurrency(totalDeductions),
      icon: <Receipt className="w-5 h-5" />,
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className={`${card.bgColor} ${card.textColor} p-2.5 rounded-lg`}>
            {card.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-xl font-bold text-slate-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
