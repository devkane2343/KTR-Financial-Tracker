
import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Expense } from '../../types';
import { Card } from '../UI/Card';
import { COLORS } from '../../constants';
import { formatCurrency } from '../../lib/utils';

interface CategoryPieChartProps {
  expenses: Expense[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ expenses }) => {
  const { data, dateRange, totalAmount } = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    const categoryCounts: { [key: string]: number } = {};
    
    expenses.forEach(exp => {
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

  return (
    <Card title="Expense Breakdown">
      {dateRange && (
        <div className="mb-3 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <span className="font-semibold">Period:</span> {dateRange}
        </div>
      )}
      {data.length > 0 ? (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  const count = props.payload?.count ?? 0;
                  const percentage = props.payload?.percentage ?? 0;
                  const countLabel = count === 1 ? '1 transaction' : `${count} transactions`;
                  return [
                    <div key="tooltip-category">
                      <div className="font-bold">{formatCurrency(value)}</div>
                      <div className="text-xs text-slate-500">{percentage.toFixed(1)}% • {countLabel}</div>
                    </div>,
                    name
                  ];
                }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-slate-400 italic text-sm">
          Add expenses to see breakdown
        </div>
      )}
    </Card>
  );
};
