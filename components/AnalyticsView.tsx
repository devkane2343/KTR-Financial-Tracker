import React from 'react';
import type { FinancialData } from '../types';
import { AnalyticsSummary } from './AnalyticsSummary';
import { SpendingTrendChart } from './Charts/SpendingTrendChart';
import { CategoryPieChart } from './Charts/CategoryPieChart';
import { IncomeVsExpenseChart } from './Charts/IncomeVsExpenseChart';
import { NetIncomeTrendChart } from './Charts/NetIncomeTrendChart';

const LOGO_URL = '/logo.png';

interface AnalyticsViewProps {
  data: FinancialData;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => (
  <div className="space-y-8 animate-in zoom-in-95 duration-500">
    <div className="flex items-center gap-3">
      <div className="bg-red-600 p-1 rounded-full w-8 h-8 flex items-center justify-center">
        <img src={LOGO_URL} className="w-6 h-6 invert" alt="Analytics Icon" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Visual Insights</h2>
    </div>
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Summary</h3>
      <AnalyticsSummary data={data} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <NetIncomeTrendChart data={data} />
      <SpendingTrendChart expenses={data.expenses} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <CategoryPieChart expenses={data.expenses} />
      <IncomeVsExpenseChart data={data} />
    </div>
  </div>
);

export default AnalyticsView;
