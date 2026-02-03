
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { FinancialData } from '../../types';
import { Card } from '../UI/Card';
import { formatCurrency, getNetIncome } from '../../lib/utils';

export type NetIncomeViewMode = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

interface NetIncomeTrendChartProps {
  data: FinancialData;
}

const VIEW_LABELS: Record<NetIncomeViewMode, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly'
};

export const NetIncomeTrendChart: React.FC<NetIncomeTrendChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<NetIncomeViewMode>('weekly');

  const chartData = useMemo(() => {
    const { incomeHistory, expenses } = data;

    // Find the earliest date from all transactions
    let earliestDate: Date | null = null;
    
    incomeHistory.forEach(inc => {
      const [y, m, d] = inc.date.split('-').map(Number);
      const incDate = new Date(y, m - 1, d);
      if (!earliestDate || incDate < earliestDate) {
        earliestDate = incDate;
      }
    });
    
    expenses.forEach(exp => {
      const [y, m, d] = exp.date.split('-').map(Number);
      const expDate = new Date(y, m - 1, d);
      if (!earliestDate || expDate < earliestDate) {
        earliestDate = expDate;
      }
    });

    // If no data, use today as the start date
    if (!earliestDate) {
      earliestDate = new Date();
    }

    const today = new Date();

    // Daily view - from first entry to today
    if (viewMode === 'daily') {
      const dayBuckets: { key: string; label: string; date: Date; dateRange: string }[] = [];
      const startDate = new Date(earliestDate);
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        const key = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dateRange = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        dayBuckets.push({ key, label, date: new Date(date), dateRange });
      }
      
      const incomeByDay: { [key: string]: { amount: number; count: number } } = {};
      const expenseByDay: { [key: string]: { amount: number; count: number } } = {};
      dayBuckets.forEach(({ key }) => {
        incomeByDay[key] = { amount: 0, count: 0 };
        expenseByDay[key] = { amount: 0, count: 0 };
      });
      incomeHistory.forEach(inc => {
        const key = inc.date;
        if (incomeByDay.hasOwnProperty(key)) {
          incomeByDay[key].amount += getNetIncome(inc);
          incomeByDay[key].count += 1;
        }
      });
      expenses.forEach(exp => {
        const key = exp.date;
        if (expenseByDay.hasOwnProperty(key)) {
          expenseByDay[key].amount += exp.amount;
          expenseByDay[key].count += 1;
        }
      });
      return dayBuckets.map(({ key, label, dateRange }) => ({
        period: label,
        netIncome: incomeByDay[key]?.amount ?? 0,
        expenses: expenseByDay[key]?.amount ?? 0,
        net: (incomeByDay[key]?.amount ?? 0) - (expenseByDay[key]?.amount ?? 0),
        dateRange,
        incomeCount: incomeByDay[key]?.count ?? 0,
        expenseCount: expenseByDay[key]?.count ?? 0
      }));
    }

    // Weekly view - from first entry to today (7-day periods)
    if (viewMode === 'weekly') {
      const weekBuckets: { key: string; label: string; start: Date; end: Date; dateRange: string }[] = [];
      const startDate = new Date(earliestDate);
      
      // Find the start of the week for the earliest date (Sunday)
      const firstWeekStart = new Date(startDate);
      firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay());
      
      let weekIndex = 0;
      for (let current = new Date(firstWeekStart); current <= today; current.setDate(current.getDate() + 7)) {
        const start = new Date(current);
        const end = new Date(current);
        end.setDate(end.getDate() + 6);
        
        // Don't show future weeks
        if (start > today) break;
        
        // Clamp end date to today if needed
        const actualEnd = end > today ? today : end;
        
        const key = `w-${weekIndex}`;
        const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = actualEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dateRange = `${startStr} – ${endStr}`;
        weekBuckets.push({ key, label, start, end: actualEnd, dateRange });
        weekIndex++;
      }
      
      const incomeByWeek: { [key: string]: { amount: number; count: number } } = {};
      const expenseByWeek: { [key: string]: { amount: number; count: number } } = {};
      weekBuckets.forEach(({ key }) => {
        incomeByWeek[key] = { amount: 0, count: 0 };
        expenseByWeek[key] = { amount: 0, count: 0 };
      });
      incomeHistory.forEach(inc => {
        const [y, m, d] = inc.date.split('-').map(Number);
        const incDate = new Date(y, m - 1, d);
        const bucket = weekBuckets.find(b => incDate >= b.start && incDate <= b.end);
        if (bucket) {
          incomeByWeek[bucket.key].amount += getNetIncome(inc);
          incomeByWeek[bucket.key].count += 1;
        }
      });
      expenses.forEach(exp => {
        const [y, m, d] = exp.date.split('-').map(Number);
        const expDate = new Date(y, m - 1, d);
        const bucket = weekBuckets.find(b => expDate >= b.start && expDate <= b.end);
        if (bucket) {
          expenseByWeek[bucket.key].amount += exp.amount;
          expenseByWeek[bucket.key].count += 1;
        }
      });
      return weekBuckets.map(({ key, label, dateRange }) => ({
        period: label,
        netIncome: incomeByWeek[key]?.amount ?? 0,
        expenses: expenseByWeek[key]?.amount ?? 0,
        net: (incomeByWeek[key]?.amount ?? 0) - (expenseByWeek[key]?.amount ?? 0),
        dateRange,
        incomeCount: incomeByWeek[key]?.count ?? 0,
        expenseCount: expenseByWeek[key]?.count ?? 0
      }));
    }

    // Bi-weekly view - from first entry to today (14-day periods)
    if (viewMode === 'biweekly') {
      const biweekBuckets: { key: string; label: string; start: Date; end: Date; dateRange: string }[] = [];
      const startDate = new Date(earliestDate);
      
      // Find the start of the week for the earliest date (Sunday)
      const firstBiweekStart = new Date(startDate);
      firstBiweekStart.setDate(firstBiweekStart.getDate() - firstBiweekStart.getDay());
      
      let biweekIndex = 0;
      for (let current = new Date(firstBiweekStart); current <= today; current.setDate(current.getDate() + 14)) {
        const start = new Date(current);
        const end = new Date(current);
        end.setDate(end.getDate() + 13);
        
        // Don't show future periods
        if (start > today) break;
        
        // Clamp end date to today if needed
        const actualEnd = end > today ? today : end;
        
        const key = `bw-${biweekIndex}`;
        const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = actualEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dateRange = `${startStr} – ${endStr}`;
        biweekBuckets.push({ key, label, start, end: actualEnd, dateRange });
        biweekIndex++;
      }
      
      const incomeByBiweek: { [key: string]: { amount: number; count: number } } = {};
      const expenseByBiweek: { [key: string]: { amount: number; count: number } } = {};
      biweekBuckets.forEach(({ key }) => {
        incomeByBiweek[key] = { amount: 0, count: 0 };
        expenseByBiweek[key] = { amount: 0, count: 0 };
      });
      incomeHistory.forEach(inc => {
        const [y, m, d] = inc.date.split('-').map(Number);
        const incDate = new Date(y, m - 1, d);
        const bucket = biweekBuckets.find(b => incDate >= b.start && incDate <= b.end);
        if (bucket) {
          incomeByBiweek[bucket.key].amount += getNetIncome(inc);
          incomeByBiweek[bucket.key].count += 1;
        }
      });
      expenses.forEach(exp => {
        const [y, m, d] = exp.date.split('-').map(Number);
        const expDate = new Date(y, m - 1, d);
        const bucket = biweekBuckets.find(b => expDate >= b.start && expDate <= b.end);
        if (bucket) {
          expenseByBiweek[bucket.key].amount += exp.amount;
          expenseByBiweek[bucket.key].count += 1;
        }
      });
      return biweekBuckets.map(({ key, label, dateRange }) => ({
        period: label,
        netIncome: incomeByBiweek[key]?.amount ?? 0,
        expenses: expenseByBiweek[key]?.amount ?? 0,
        net: (incomeByBiweek[key]?.amount ?? 0) - (expenseByBiweek[key]?.amount ?? 0),
        dateRange,
        incomeCount: incomeByBiweek[key]?.count ?? 0,
        expenseCount: expenseByBiweek[key]?.count ?? 0
      }));
    }

    // Yearly view - from first entry year to current year
    if (viewMode === 'yearly') {
      const yearBuckets: { key: string; label: string; year: number; dateRange: string }[] = [];
      const startYear = earliestDate.getFullYear();
      const currentYear = today.getFullYear();
      
      for (let year = startYear; year <= currentYear; year++) {
        const key = String(year);
        const label = String(year);
        const dateRange = `January 1 – December 31, ${year}`;
        yearBuckets.push({ key, label, year, dateRange });
      }
      
      const incomeByYear: { [key: string]: { amount: number; count: number } } = {};
      const expenseByYear: { [key: string]: { amount: number; count: number } } = {};
      yearBuckets.forEach(({ key }) => {
        incomeByYear[key] = { amount: 0, count: 0 };
        expenseByYear[key] = { amount: 0, count: 0 };
      });
      incomeHistory.forEach(inc => {
        const key = inc.date.slice(0, 4);
        if (incomeByYear.hasOwnProperty(key)) {
          incomeByYear[key].amount += getNetIncome(inc);
          incomeByYear[key].count += 1;
        }
      });
      expenses.forEach(exp => {
        const key = exp.date.slice(0, 4);
        if (expenseByYear.hasOwnProperty(key)) {
          expenseByYear[key].amount += exp.amount;
          expenseByYear[key].count += 1;
        }
      });
      return yearBuckets.map(({ key, label, dateRange }) => ({
        period: label,
        netIncome: incomeByYear[key]?.amount ?? 0,
        expenses: expenseByYear[key]?.amount ?? 0,
        net: (incomeByYear[key]?.amount ?? 0) - (expenseByYear[key]?.amount ?? 0),
        dateRange,
        incomeCount: incomeByYear[key]?.count ?? 0,
        expenseCount: expenseByYear[key]?.count ?? 0
      }));
    }

    // Monthly view - from first entry month to current month (default fallback)
    const monthBuckets: { key: string; label: string; dateRange: string }[] = [];
    const startYear = earliestDate.getFullYear();
    const startMonth = earliestDate.getMonth();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    for (let y = startYear; y <= currentYear; y++) {
      const firstMonth = (y === startYear) ? startMonth : 0;
      const lastMonth = (y === currentYear) ? currentMonth : 11;
      
      for (let m = firstMonth; m <= lastMonth; m++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0);
        const dateRange = `${monthStart.toLocaleDateString('en-US', { month: 'long' })} 1 – ${monthEnd.getDate()}, ${y}`;
        monthBuckets.push({
          key,
          label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          dateRange
        });
      }
    }
    
    const incomeByMonth: { [key: string]: { amount: number; count: number } } = {};
    const expenseByMonth: { [key: string]: { amount: number; count: number } } = {};
    monthBuckets.forEach(({ key }) => {
      incomeByMonth[key] = { amount: 0, count: 0 };
      expenseByMonth[key] = { amount: 0, count: 0 };
    });
    incomeHistory.forEach(inc => {
      const key = inc.date.slice(0, 7);
      if (incomeByMonth.hasOwnProperty(key)) {
        incomeByMonth[key].amount += getNetIncome(inc);
        incomeByMonth[key].count += 1;
      }
    });
    expenses.forEach(exp => {
      const key = exp.date.slice(0, 7);
      if (expenseByMonth.hasOwnProperty(key)) {
        expenseByMonth[key].amount += exp.amount;
        expenseByMonth[key].count += 1;
      }
    });
    return monthBuckets.map(({ key, label, dateRange }) => ({
      period: label,
      netIncome: incomeByMonth[key]?.amount ?? 0,
      expenses: expenseByMonth[key]?.amount ?? 0,
      net: (incomeByMonth[key]?.amount ?? 0) - (expenseByMonth[key]?.amount ?? 0),
      dateRange,
      incomeCount: incomeByMonth[key]?.count ?? 0,
      expenseCount: expenseByMonth[key]?.count ?? 0
    }));
  }, [data, viewMode]);

  return (
    <Card title="Net Income Over Time">
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(VIEW_LABELS) as NetIncomeViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(val) => `₱${val}`}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => {
                const incomeCount = props.payload?.incomeCount ?? 0;
                const expenseCount = props.payload?.expenseCount ?? 0;
                let label = '';
                let count = 0;
                
                if (name === 'netIncome') {
                  label = 'Net Income';
                  count = incomeCount;
                } else if (name === 'expenses') {
                  label = 'Expenses';
                  count = expenseCount;
                } else {
                  label = 'Net (Income − Expenses)';
                }
                
                const countLabel = name !== 'net' ? (count === 1 ? '1 entry' : `${count} entries`) : '';
                
                return [
                  <div key={`tooltip-${name}`}>
                    <div className="font-bold">{formatCurrency(value)}</div>
                    {countLabel && <div className="text-xs text-slate-500">{countLabel}</div>}
                  </div>,
                  label
                ];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0] && payload[0].payload && payload[0].payload.dateRange) {
                  return payload[0].payload.dateRange;
                }
                return label;
              }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="netIncome" name="netIncome" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="expenses" name="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="net" name="net" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Net Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" /> Expenses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500" /> Net (Income − Expenses)
        </span>
      </div>
    </Card>
  );
};
