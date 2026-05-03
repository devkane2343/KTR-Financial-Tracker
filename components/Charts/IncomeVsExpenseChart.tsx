
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { FinancialData } from '../../types';
import { Card } from '../UI/Card';
import { getNetIncome, getDeductionsForEntry, formatCurrency, isSavingsCategory } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';

interface IncomeVsExpenseChartProps {
  data: FinancialData;
}

export const IncomeVsExpenseChart: React.FC<IncomeVsExpenseChartProps> = ({ data }) => {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const gridStroke    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.06)';
  const tickFill      = isDark ? '#a1a1aa' : '#52525b';
  const tooltipBg     = isDark ? '#fafafa' : '#09090b';
  const tooltipText   = isDark ? '#09090b' : '#ffffff';
  const cursorFill    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.04)';
  const trackBg       = isDark ? '#27272a' : '#f4f4f5';
  const expenseColor  = isDark ? '#a1a1aa' : '#52525b';
  const foregroundCol = isDark ? '#fafafa' : '#09090b';

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
    { name: 'Lifetime net income', amount: totalNet, color: '#10b981' },
    { name: 'Mandatory deductions', amount: totalDeductions, color: expenseColor },
    { name: 'Lifetime savings', amount: totalSavings, color: '#059669' },
    { name: 'Lifetime expenses', amount: totalExp, color: foregroundCol }
  ];

  const burnTone = utilization > 90 ? 'coral' : utilization > 70 ? 'gold' : 'jade';
  const burnLabel = utilization > 90 ? 'Aggressive — pull back' : utilization > 70 ? 'Watchful' : 'Disciplined';

  return (
    <Card title="Budget utilization" eyebrow="Allocation">
      {dateRange && (
        <p className="font-mono text-[11px] text-ink-muted mb-4">{dateRange}</p>
      )}
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -10, right: 24 }}>
            <CartesianGrid strokeDasharray="2 4" horizontal vertical={false} stroke={gridStroke} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 500, fill: tickFill, fontFamily: 'Geist' }}
              width={140}
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', background: tooltipBg, color: tooltipText, fontSize: '12px', fontFamily: 'Geist', boxShadow: '0 8px 24px -12px rgba(0,0,0,0.30)' }}
              labelStyle={{ color: tooltipText, opacity: 0.6 }}
              itemStyle={{ color: tooltipText }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-rule">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-ink-muted">Burn rate</span>
          <div className="flex items-baseline gap-2">
            <span className="num text-xl font-semibold text-ink">{Math.round(utilization)}<span className="text-ink-whisper text-sm">%</span></span>
            <span className={`text-xs font-medium ${
              burnTone === 'coral' ? 'text-coral-600' : burnTone === 'gold' ? 'text-gold-700' : 'text-jade-700'
            }`}>{burnLabel}</span>
          </div>
        </div>
        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: trackBg }}>
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              burnTone === 'coral' ? 'bg-coral-500' : burnTone === 'gold' ? 'bg-gold-500' : 'bg-jade-500'
            }`}
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
