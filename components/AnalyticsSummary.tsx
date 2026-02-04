
import React, { useMemo, useState } from 'react';
import { FinancialData } from '../types';
import { formatCurrency, getNetIncome } from '../lib/utils';
import { TrendingUp, Wallet, CreditCard, BarChart3, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface AnalyticsSummaryProps {
  data: FinancialData;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({ data }) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const { dateRange, monthlyGrossIncome, monthlyNetIncome, monthlyExpenses, monthlyNetBalance, monthPeriod, sortedMonths, incomeCountForMonth, expenseCountForMonth } = useMemo(() => {
    // Calculate overall date range
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

    let monthPeriod = 'No data';
    let monthlyGrossIncome = 0;
    let monthlyNetIncome = 0;
    let monthlyExpenses = 0;
    let monthlyNetBalance = 0;
    let incomeCountForMonth = 0;
    let expenseCountForMonth = 0;
    let sortedMonths: string[] = [];
    
    // Get all unique months from income data
    const monthsSet = new Set<string>();
    data.incomeHistory.forEach(inc => {
      const [y, m] = inc.date.split('-').map(Number);
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    data.expenses.forEach(exp => {
      const [y, m] = exp.date.split('-').map(Number);
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });

    if (monthsSet.size > 0) {
      // Get sorted months (oldest to newest)
      sortedMonths = Array.from(monthsSet).sort();
      
      // Get the selected month (counting from the most recent, so 0 = most recent)
      const monthIndex = Math.min(selectedMonthIndex, sortedMonths.length - 1);
      const selectedMonth = sortedMonths[sortedMonths.length - 1 - monthIndex];
      
      // Filter data for selected month
      const selectedMonthIncome = data.incomeHistory.filter(inc => {
        const [y, m] = inc.date.split('-').map(Number);
        const monthKey = `${y}-${String(m).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
      
      const selectedMonthExpenses = data.expenses.filter(exp => {
        const [y, m] = exp.date.split('-').map(Number);
        const monthKey = `${y}-${String(m).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
      
      // Calculate metrics for selected month
      monthlyGrossIncome = selectedMonthIncome.reduce((sum, inc) => sum + (inc.weeklySalary || 0), 0);
      monthlyNetIncome = selectedMonthIncome.reduce((sum, inc) => sum + getNetIncome(inc), 0);
      monthlyExpenses = selectedMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      monthlyNetBalance = monthlyNetIncome - monthlyExpenses;
      incomeCountForMonth = selectedMonthIncome.length;
      expenseCountForMonth = selectedMonthExpenses.length;
      
      // Format as "January 1, 2026 - January 31, 2026"
      const [y, m] = selectedMonth.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);
      
      const formatFullDate = (d: Date) => d.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      monthPeriod = `${formatFullDate(firstDay)} - ${formatFullDate(lastDay)}`;
    }

    return { dateRange, monthlyGrossIncome, monthlyNetIncome, monthlyExpenses, monthlyNetBalance, monthPeriod, sortedMonths, incomeCountForMonth, expenseCountForMonth };
  }, [data, selectedMonthIndex]);

  const averageNetIncomeForMonth = incomeCountForMonth > 0 ? monthlyNetIncome / incomeCountForMonth : 0;

  const cards = [
    {
      label: 'Monthly Gross Income',
      value: formatCurrency(monthlyGrossIncome),
      icon: <TrendingUp className="w-5 h-5" />,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      sublabel: monthPeriod
    },
    {
      label: 'Average Net Income',
      sublabel: `${incomeCountForMonth} ${incomeCountForMonth === 1 ? 'paycheck' : 'paychecks'}`,
      value: formatCurrency(averageNetIncomeForMonth),
      icon: <BarChart3 className="w-5 h-5" />,
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(monthlyExpenses),
      icon: <CreditCard className="w-5 h-5" />,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      sublabel: `${expenseCountForMonth} ${expenseCountForMonth === 1 ? 'transaction' : 'transactions'}`
    },
    {
      label: 'Net Balance',
      value: formatCurrency(monthlyNetBalance),
      icon: <Wallet className="w-5 h-5" />,
      textColor: monthlyNetBalance >= 0 ? 'text-blue-600' : 'text-red-600',
      bgColor: monthlyNetBalance >= 0 ? 'bg-blue-50' : 'bg-red-50',
      sublabel: monthlyNetBalance >= 0 ? 'Available' : 'Deficit'
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
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                {sortedMonths.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedMonthIndex(prev => Math.min(prev + 1, sortedMonths.length - 1))}
                      disabled={selectedMonthIndex >= sortedMonths.length - 1}
                      className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setSelectedMonthIndex(prev => Math.max(prev - 1, 0))}
                      disabled={selectedMonthIndex <= 0}
                      className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Next month"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
              {card.sublabel && <p className="text-[10px] text-slate-400 mb-0.5">{card.sublabel}</p>}
              <p className="text-xl font-bold text-slate-900 truncate">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
