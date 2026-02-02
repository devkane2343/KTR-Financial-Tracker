
import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Expense } from '../../types';
import { Card } from '../UI/Card';
import { formatCurrency } from '../../lib/utils';

interface SpendingTrendChartProps {
  expenses: Expense[];
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ expenses }) => {
  const chartData = useMemo(() => {
    const dailyData: { [key: string]: number } = {};
    
    // Last 14 days (local date strings so they match expense dates)
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
      return { date: label, amount };
    });
  }, [expenses]);

  return (
    <Card title="Spending Trend (Last 14 Days)">
      <div className="h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
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
