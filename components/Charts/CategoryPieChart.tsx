
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Expense } from '../../types';
import { Card } from '../UI/Card';
import { COLORS } from '../../constants';
import { formatCurrency, isSavingsCategory } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';

interface CategoryPieChartProps {
  expenses: Expense[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ expenses }) => {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const sliceStroke = isDark ? '#0a0a0b' : '#ffffff';
  const tooltipBg   = isDark ? '#fafafa' : '#09090b';
  const tooltipText = isDark ? '#09090b' : '#ffffff';
  // Palette flips its dark-foreground entry to a light tone in dark mode
  const PALETTE = isDark
    ? ['#fafafa', '#10b981', '#f59e0b', '#ef4444', '#a1a1aa', '#34d399', '#71717a', '#e4e4e7', '#fbbf24', '#d4d4d8']
    : ['#09090b', '#10b981', '#f59e0b', '#ef4444', '#52525b', '#059669', '#a1a1aa', '#27272a', '#d97706', '#71717a'];

  const { data, dateRange, totalAmount } = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    const categoryCounts: { [key: string]: number } = {};
    
    expenses
      .filter(exp => !isSavingsCategory(exp.category))
      .forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1;
      });

    const totalAmount = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    const data = Object.entries(categoryTotals)
      .map(([name, value]) => ({ 
        name, 
        value, 
        count: categoryCounts[name],
        percentage: totalAmount > 0 ? (value / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate date range
    let dateRange = '';
    if (expenses.length > 0) {
      const dates = expenses.map(exp => {
        const [y, m, d] = exp.date.split('-').map(Number);
        return new Date(y, m - 1, d);
      });
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
      const latest = new Date(Math.max(...dates.map(d => d.getTime())));
      const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      if (earliest.getTime() === latest.getTime()) {
        dateRange = formatDate(earliest);
      } else {
        dateRange = `${formatDate(earliest)} – ${formatDate(latest)}`;
      }
    }

    return { data, dateRange, totalAmount };
  }, [expenses]);

  const topCategory = data[0];

  return (
    <Card title="Expense breakdown" eyebrow="Composition">
      {dateRange && (
        <p className="font-mono text-[11px] text-ink-muted mb-4">{dateRange}</p>
      )}
      {data.length > 0 ? (
        <>
          <div className="relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke={sliceStroke}
                  strokeWidth={3}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    const count = props.payload?.count ?? 0;
                    const percentage = props.payload?.percentage ?? 0;
                    const countLabel = count === 1 ? '1 transaction' : `${count} transactions`;
                    return [
                      <div key="tooltip-category">
                        <div className="font-mono font-medium">{formatCurrency(value)}</div>
                        <div className="text-xs opacity-60 font-mono">{percentage.toFixed(1)}% &middot; {countLabel}</div>
                      </div>,
                      name
                    ];
                  }}
                  contentStyle={{ borderRadius: '8px', border: 'none', background: tooltipBg, color: tooltipText, fontSize: '12px', fontFamily: 'Geist', boxShadow: '0 8px 24px -12px rgba(0,0,0,0.30)' }}
                  itemStyle={{ color: tooltipText }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centered total in donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="eyebrow mb-1">Total Spent</p>
              <p className="num text-xl text-ink font-medium">{formatCurrency(totalAmount)}</p>
              {topCategory && (
                <p className="text-[10px] text-ink-muted mt-1.5">
                  Top: <span className="text-ink font-medium">{topCategory.name}</span> ({topCategory.percentage.toFixed(0)}%)
                </p>
              )}
            </div>
          </div>

          {/* Legend grid — editorial */}
          <div className="mt-5 pt-5 border-t border-rule grid grid-cols-2 gap-x-4 gap-y-2">
            {data.slice(0, 6).map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between gap-2 min-w-0">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                  <span className="text-xs text-ink truncate">{entry.name}</span>
                </span>
                <span className="num text-xs text-ink-muted shrink-0">{entry.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-ink-muted text-sm">
          Add expenses to see breakdown
        </div>
      )}
    </Card>
  );
};
