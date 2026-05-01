
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Expense } from '../../types';
import { Card } from '../UI/Card';
import { COLORS } from '../../constants';
import { formatCurrency, isSavingsCategory } from '../../lib/utils';

interface CategoryPieChartProps {
  expenses: Expense[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ expenses }) => {
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

  // Editorial palette for categories
  const PALETTE = ['#0e5544', '#b8893d', '#c4543a', '#0a0d10', '#3f835c', '#946d31', '#dab866', '#5a6168', '#08362b', '#705225'];

  const topCategory = data[0];

  return (
    <Card title="Expense Breakdown" eyebrow="Chapter · Composition">
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
                  stroke="#fbf8f1"
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
                  contentStyle={{ borderRadius: '12px', border: 'none', background: '#0a0d10', color: '#fbf8f1', fontSize: '12px', fontFamily: 'Geist', boxShadow: '0 12px 32px -16px rgba(10,13,16,0.4)' }}
                  itemStyle={{ color: '#fbf8f1' }}
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
        <div className="h-[260px] flex items-center justify-center text-ink-whisper italic text-sm font-display">
          Add expenses to see breakdown
        </div>
      )}
    </Card>
  );
};
