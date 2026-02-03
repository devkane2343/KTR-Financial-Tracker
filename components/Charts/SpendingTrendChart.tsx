
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Expense } from '../../types';
import { Card } from '../UI/Card';
import { formatCurrency } from '../../lib/utils';

export type SpendingViewMode = 'daily' | 'weekly' | 'monthly';

interface SpendingTrendChartProps {
  expenses: Expense[];
}

const VIEW_LABELS: Record<SpendingViewMode, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly'
};

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ expenses }) => {
  const [viewMode, setViewMode] = useState<SpendingViewMode>('daily');

  const chartData = useMemo(() => {
    // Find the earliest expense date
    let earliestDate: Date | null = null;
    
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

    if (viewMode === 'daily') {
      const dailyData: { [key: string]: { amount: number; fullDate: string; count: number } } = {};
      const startDate = new Date(earliestDate);
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${day}`;
        dailyData[key] = { 
          amount: 0, 
          count: 0,
          fullDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        };
      }
      
      expenses.forEach(exp => {
        if (dailyData.hasOwnProperty(exp.date)) {
          dailyData[exp.date].amount += exp.amount;
          dailyData[exp.date].count += 1;
        }
      });
      return Object.entries(dailyData).map(([dateStr, data]) => {
        const [y, m, d] = dateStr.split('-');
        const label = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { 
          period: label, 
          amount: data.amount,
          fullDate: data.fullDate,
          count: data.count
        };
      });
    }

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
      
      const weeklyData: { [key: string]: { amount: number; count: number } } = {};
      weekBuckets.forEach(({ key }) => { weeklyData[key] = { amount: 0, count: 0 }; });
      expenses.forEach(exp => {
        const [y, m, d] = exp.date.split('-').map(Number);
        const expDate = new Date(y, m - 1, d);
        const bucket = weekBuckets.find(
          b => expDate >= b.start && expDate <= b.end
        );
        if (bucket) {
          weeklyData[bucket.key].amount += exp.amount;
          weeklyData[bucket.key].count += 1;
        }
      });
      return weekBuckets.map(({ key, label, dateRange }) => ({
        period: label,
        amount: weeklyData[key]?.amount ?? 0,
        count: weeklyData[key]?.count ?? 0,
        dateRange
      }));
    }

    // monthly - from first entry month to current month
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
    
    const monthlyData: { [key: string]: { amount: number; count: number } } = {};
    monthBuckets.forEach(({ key }) => { monthlyData[key] = { amount: 0, count: 0 }; });
    expenses.forEach(exp => {
      const key = exp.date.slice(0, 7);
      if (monthlyData.hasOwnProperty(key)) {
        monthlyData[key].amount += exp.amount;
        monthlyData[key].count += 1;
      }
    });
    return monthBuckets.map(({ key, label, dateRange }) => ({
      period: label,
      amount: monthlyData[key]?.amount ?? 0,
      count: monthlyData[key]?.count ?? 0,
      dateRange
    }));
  }, [expenses, viewMode]);

  return (
    <Card title="Spending Trend">
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(VIEW_LABELS) as SpendingViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                const count = props.payload?.count ?? 0;
                const countLabel = count === 1 ? '1 transaction' : `${count} transactions`;
                return [
                  <div key="tooltip-content">
                    <div className="font-bold">{formatCurrency(value)}</div>
                    <div className="text-xs text-slate-500">{countLabel}</div>
                  </div>,
                  'Spent'
                ];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0] && payload[0].payload) {
                  return payload[0].payload.dateRange || payload[0].payload.fullDate || label;
                }
                return label;
              }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
