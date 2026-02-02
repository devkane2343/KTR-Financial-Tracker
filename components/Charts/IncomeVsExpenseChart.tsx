
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { FinancialData } from '../../types';
import { Card } from '../UI/Card';
import { getNetIncome, getDeductionsForEntry, formatCurrency } from '../../lib/utils';

interface IncomeVsExpenseChartProps {
  data: FinancialData;
}

export const IncomeVsExpenseChart: React.FC<IncomeVsExpenseChartProps> = ({ data }) => {
  const totalNet = data.incomeHistory.reduce((sum, inc) => sum + getNetIncome(inc), 0);
  const totalExp = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalDeductions = data.incomeHistory.reduce((sum, inc) => sum + getDeductionsForEntry(inc), 0);

  const chartData = [
    { name: 'Lifetime Net Income', amount: totalNet, color: '#10b981' },
    { name: 'Mandatory Deductions', amount: totalDeductions, color: '#ef4444' },
    { name: 'Lifetime Expenses', amount: totalExp, color: '#f59e0b' }
  ];

  const utilization = totalNet > 0 ? (totalExp / totalNet) * 100 : 0;

  return (
    <Card title="Overall Budget Utilization">
      <div className="h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: -20, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 500, fill: '#64748b' }}
              width={120}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
          <span>Overall Burn Rate</span>
          <span>{Math.round(utilization)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${
              utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, utilization)}%` }}
          ></div>
        </div>
      </div>
    </Card>
  );
};
