
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { FinancialData } from '../../types';
import { Card } from '../UI/Card';
import { getNetIncome, getDeductionsForEntry, formatCurrency, isSavingsCategory } from '../../lib/utils';

interface IncomeVsExpenseChartProps {
  data: FinancialData;
}

export const IncomeVsExpenseChart: React.FC<IncomeVsExpenseChartProps> = ({ data }) => {
  const { totalNet, totalExp, totalDeductions, totalSavings, utilization, dateRange } = useMemo(() => {
    const totalNet = data.incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
    const totalExp = data.expenses
      .filter(exp => !isSavingsCategory(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);
    const totalDeductions = data.incomeHistory.reduce((sum, inc) => sum + getDeductionsForEntry(inc), 0);
    const savingsFromIncome = data.incomeHistory.reduce(
      (sum, inc) => sum + (inc.emergencyFund || 0) + (inc.generalSavings || 0), 0
    );
    const savingsFromExpenses = data.expenses
      .filter(exp => isSavingsCategory(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);
    const totalSavings = savingsFromIncome + savingsFromExpenses;
    const utilization = totalNet > 0 ? (totalExp / totalNet) * 100 : 0;

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

    let dateRange = '';
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

    return { totalNet, totalExp, totalDeductions, totalSavings, utilization, dateRange };
  }, [data]);

  const chartData = [
    { name: 'Lifetime Net Income', amount: totalNet, color: '#0e5544' },
    { name: 'Mandatory Deductions', amount: totalDeductions, color: '#0a0d10' },
    { name: 'Lifetime Savings', amount: totalSavings, color: '#3f835c' },
    { name: 'Lifetime Expenses', amount: totalExp, color: '#b8893d' }
  ];

  const burnTone = utilization > 90 ? 'coral' : utilization > 70 ? 'gold' : 'jade';
  const burnLabel = utilization > 90 ? 'Aggressive — pull back' : utilization > 70 ? 'Watchful' : 'Disciplined';

  return (
    <Card title="Budget Utilization" eyebrow="Chapter · Allocation">
      {dateRange && (
        <p className="font-mono text-[11px] text-ink-muted mb-4">{dateRange}</p>
      )}
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -10, right: 24 }}>
            <CartesianGrid strokeDasharray="2 4" horizontal vertical={false} stroke="rgba(10,13,16,0.06)" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 500, fill: '#5a6168', fontFamily: 'Geist' }}
              width={130}
            />
            <Tooltip
              cursor={{ fill: 'rgba(10,13,16,0.04)' }}
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '12px', border: 'none', background: '#0a0d10', color: '#fbf8f1', fontSize: '12px', fontFamily: 'Geist', boxShadow: '0 12px 32px -16px rgba(10,13,16,0.4)' }}
              labelStyle={{ color: '#fbf8f1', opacity: 0.6 }}
              itemStyle={{ color: '#fbf8f1' }}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 pt-5 border-t border-rule">
        <div className="flex items-baseline justify-between mb-2">
          <span className="eyebrow">Burn Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="num text-2xl font-medium text-ink">{Math.round(utilization)}<span className="text-ink-whisper text-base">%</span></span>
            <span className={`eyebrow ${
              burnTone === 'coral' ? 'text-coral-500' : burnTone === 'gold' ? 'text-gold-600' : 'text-jade-500'
            }`}>{burnLabel}</span>
          </div>
        </div>
        <div className="w-full bg-ink/5 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              burnTone === 'coral' ? 'bg-coral-500' : burnTone === 'gold' ? 'bg-gold-500' : 'bg-jade-500'
            }`}
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
