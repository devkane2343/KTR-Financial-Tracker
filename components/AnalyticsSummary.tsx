
import React, { useMemo } from 'react';
import { FinancialData } from '../types';
import { formatCurrency, getNetIncome } from '../lib/utils';
import { TrendingUp, Wallet, CreditCard, BarChart3, Calendar } from 'lucide-react';

interface AnalyticsSummaryProps {
  data: FinancialData;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ data }) => {
  const { dateRange, totalNetIncome, totalExpenses, incomeCount, averageNetIncome, netBalance } = useMemo(() => {
    const totalNetIncome = data.incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
    const totalExpenses = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const incomeCount = data.incomeHistory.length || 1;
    const averageNetIncome = totalNetIncome / incomeCount;
    const netBalance = totalNetIncome - totalExpenses;

    // Calculate date range
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
      
      if (earliest.getTime() === latest.getTime()) {
        dateRange = formatDate(earliest);
      } else {
        dateRange = `${formatDate(earliest)} – ${formatDate(latest)}`;
      }
    }

    return { dateRange, totalNetIncome, totalExpenses, incomeCount, averageNetIncome, netBalance };
  }, [data]);

  const cards = [
    {
      label: 'Total Net Income',
      value: formatCurrency(totalNetIncome),
      icon: <TrendingUp className="w-5 h-5" />,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      sublabel: `${incomeCount} ${incomeCount === 1 ? 'paycheck' : 'paychecks'}`
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
      bgColor: 'bg-amber-50',
      sublabel: `${data.expenses.length} ${data.expenses.length === 1 ? 'transaction' : 'transactions'}`
    },
    {
      label: 'Net Balance',
      value: formatCurrency(netBalance),
      icon: <Wallet className="w-5 h-5" />,
      textColor: netBalance >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: netBalance >= 0 ? 'bg-blue-50' : 'bg-red-50',
      sublabel: netBalance >= 0 ? 'Available' : 'Deficit'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Date Range Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-indigo-900">Data Period</p>
          <p className="text-sm font-bold text-indigo-700 truncate">{dateRange}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className={`${card.bgColor} ${card.textColor} p-2.5 rounded-lg shrink-0`}>
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{card.label}</p>
              {card.sublabel && <p className="text-[10px] text-slate-400 mb-0.5">{card.sublabel}</p>}
              <p className="text-xl font-bold text-slate-900 truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
