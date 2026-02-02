
import React from 'react';
import { FinancialData } from '../types';
import { formatCurrency, getNetIncome } from '../lib/utils';
import { TrendingUp, Wallet, CreditCard, BarChart3 } from 'lucide-react';

interface AnalyticsSummaryProps {
  data: FinancialData;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ data }) => {
  const totalNetIncome = data.incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const incomeCount = data.incomeHistory.length || 1;
  const averageNetIncome = totalNetIncome / incomeCount;
  const netBalance = totalNetIncome - totalExpenses;

  const cards = [
    {
      label: 'Total Net Income',
      value: formatCurrency(totalNetIncome),
      icon: <TrendingUp className="w-5 h-5" />,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      label: 'Average Net Income',
      sublabel: 'per paycheck',
      value: formatCurrency(averageNetIncome),
      icon: <BarChart3 className="w-5 h-5" />,
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      icon: <CreditCard className="w-5 h-5" />,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      label: 'Net Balance',
      value: formatCurrency(netBalance),
      icon: <Wallet className="w-5 h-5" />,
      textColor: netBalance >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: netBalance >= 0 ? 'bg-blue-50' : 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className={`${card.bgColor} ${card.textColor} p-2.5 rounded-lg shrink-0`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{card.label}</p>
            {card.sublabel && <p className="text-[10px] text-slate-400 mb-0.5">{card.sublabel}</p>}
            <p className="text-xl font-bold text-slate-900 truncate">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
