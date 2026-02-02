
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { FinancialData } from '../../types';
import { Card } from '../UI/Card';
import { formatCurrency, getNetIncome } from '../../lib/utils';

export type NetIncomeViewMode = 'weekly' | 'monthly';

interface NetIncomeTrendChartProps {
  data: FinancialData;
}

const VIEW_LABELS: Record<NetIncomeViewMode, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly'
};

export const NetIncomeTrendChart: React.FC<NetIncomeTrendChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<NetIncomeViewMode>('weekly');

  const chartData = useMemo(() => {
    const { incomeHistory, expenses } = data;

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
      const incomeByWeek: { [key: string]: number } = {};
      const expenseByWeek: { [key: string]: number } = {};
      weekBuckets.forEach(({ key }) => {
        incomeByWeek[key] = 0;
        expenseByWeek[key] = 0;
      });
      incomeHistory.forEach(inc => {
        const [y, m, d] = inc.date.split('-').map(Number);
        const incDate = new Date(y, m - 1, d);
        const bucket = weekBuckets.find(b => incDate >= b.start && incDate <= b.end);
        if (bucket) incomeByWeek[bucket.key] += getNetIncome(inc);
      });
      expenses.forEach(exp => {
        const [y, m, d] = exp.date.split('-').map(Number);
        const expDate = new Date(y, m - 1, d);
        const bucket = weekBuckets.find(b => expDate >= b.start && expDate <= b.end);
        if (bucket) expenseByWeek[bucket.key] += exp.amount;
      });
      return weekBuckets.map(({ key, label }) => ({
        period: label,
        netIncome: incomeByWeek[key] ?? 0,
        expenses: expenseByWeek[key] ?? 0,
        net: (incomeByWeek[key] ?? 0) - (expenseByWeek[key] ?? 0)
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
    const incomeByMonth: { [key: string]: number } = {};
    const expenseByMonth: { [key: string]: number } = {};
    monthBuckets.forEach(({ key }) => {
      incomeByMonth[key] = 0;
      expenseByMonth[key] = 0;
    });
    incomeHistory.forEach(inc => {
      const key = inc.date.slice(0, 7);
      if (incomeByMonth.hasOwnProperty(key)) incomeByMonth[key] += getNetIncome(inc);
    });
    expenses.forEach(exp => {
      const key = exp.date.slice(0, 7);
      if (expenseByMonth.hasOwnProperty(key)) expenseByMonth[key] += exp.amount;
    });
    return monthBuckets.map(({ key, label }) => ({
      period: label,
      netIncome: incomeByMonth[key] ?? 0,
      expenses: expenseByMonth[key] ?? 0,
      net: (incomeByMonth[key] ?? 0) - (expenseByMonth[key] ?? 0)
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
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'netIncome' ? 'Net Income' : name === 'expenses' ? 'Expenses' : 'Net (Income − Expenses)'
              ]}
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
