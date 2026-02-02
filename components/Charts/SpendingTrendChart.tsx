
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
  daily: '14 Days',
  weekly: 'Weekly',
  monthly: 'Monthly'
};

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ expenses }) => {
  const [viewMode, setViewMode] = useState<SpendingViewMode>('daily');

  const chartData = useMemo(() => {
    if (viewMode === 'daily') {
      const dailyData: { [key: string]: number } = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dailyData[`${y}-${m}-${day}`] = 0;
      }
      expenses.forEach(exp => {
        if (dailyData.hasOwnProperty(exp.date)) {
          dailyData[exp.date] += exp.amount;
        }
      });
      return Object.entries(dailyData).map(([dateStr, amount]) => {
        const [y, m, d] = dateStr.split('-');
        const label = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { period: label, amount };
      });
    }

    if (viewMode === 'weekly') {
      const weekBuckets: { key: string; label: string; start: Date; end: Date }[] = [];
      for (let i = 11; i >= 0; i--) {
        const end = new Date();
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        const key = `w-${i}`;
        const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weekBuckets.push({ key, label, start, end });
      }
      const weeklyData: { [key: string]: number } = {};
      weekBuckets.forEach(({ key }) => { weeklyData[key] = 0; });
      expenses.forEach(exp => {
        const [y, m, d] = exp.date.split('-').map(Number);
        const expDate = new Date(y, m - 1, d);
        const bucket = weekBuckets.find(
          b => expDate >= b.start && expDate <= b.end
        );
        if (bucket) weeklyData[bucket.key] += exp.amount;
      });
      return weekBuckets.map(({ key, label }) => ({
        period: label,
        amount: weeklyData[key] ?? 0
      }));
    }

    // monthly
    const monthBuckets: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      monthBuckets.push({
        key,
        label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      });
    }
    const monthlyData: { [key: string]: number } = {};
    monthBuckets.forEach(({ key }) => { monthlyData[key] = 0; });
    expenses.forEach(exp => {
      const key = exp.date.slice(0, 7);
      if (monthlyData.hasOwnProperty(key)) monthlyData[key] += exp.amount;
    });
    return monthBuckets.map(({ key, label }) => ({
      period: label,
      amount: monthlyData[key] ?? 0
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
              formatter={(value: number) => [formatCurrency(value), 'Spent']}
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
