import React, { useState } from 'react';
import type { FinancialData } from '../types';
import { AnalyticsSummary } from './AnalyticsSummary';
import { SpendingTrendChart } from './Charts/SpendingTrendChart';
import { CategoryPieChart } from './Charts/CategoryPieChart';
import { IncomeVsExpenseChart } from './Charts/IncomeVsExpenseChart';
import { NetIncomeTrendChart } from './Charts/NetIncomeTrendChart';
import { Download, FileText } from 'lucide-react';
import { generateFinancialReportPDF } from '../lib/pdfExport';
import { supabase } from '../lib/supabase';

interface AnalyticsViewProps {
  data: FinancialData;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.email || 'User';
      await generateFinancialReportPDF(data, userName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const isEmpty = data.incomeHistory.length === 0 && data.expenses.length === 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-rule">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-ink tracking-tight">
            Analytics
          </h1>
          <p className="text-ink-muted text-sm mt-1 max-w-md">
            Patterns and trends, calculated from your own data.
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting || isEmpty}
          className="group inline-flex items-center gap-2 px-3.5 py-2 bg-ink text-paper rounded-lg hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          title="Download financial report as PDF"
        >
          {isExporting ? (
            <>
              <span className="w-3.5 h-3.5 border-[1.5px] border-paper/40 border-t-paper rounded-full animate-spin" />
              <span>Generating</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
              <Download className="w-3.5 h-3.5 opacity-60 transition-transform group-hover:translate-y-0.5" />
            </>
          )}
        </button>
      </div>

      <AnalyticsSummary data={data} />

      <div>
        <h2 className="text-sm font-medium text-ink mb-3">Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NetIncomeTrendChart data={data} />
          <SpendingTrendChart expenses={data.expenses} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryPieChart expenses={data.expenses} />
        <IncomeVsExpenseChart data={data} />
      </div>
    </div>
  );
};

export default AnalyticsView;
