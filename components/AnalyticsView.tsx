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
    <div className="space-y-10 animate-fade-up">
      {/* Editorial masthead */}
      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-6 border-b-2 border-ink/15">
          <div className="min-w-0">
            <p className="eyebrow mb-2">Section II &middot; The Analysis</p>
            <h1 className="font-display text-5xl sm:text-6xl text-ink leading-[0.9] tracking-tight">
              Your money,<br />
              <em className="text-jade-500" style={{ fontStyle: 'italic' }}>read closely.</em>
            </h1>
            <p className="text-ink-muted text-sm mt-3 max-w-md leading-relaxed">
              Patterns the eye misses, kept honest by arithmetic. Every line below is calculated from your own ledger.
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExporting || isEmpty}
            className="group flex items-center gap-2 px-5 py-3 bg-ink text-paper rounded-full hover:bg-jade-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[13px] font-medium shadow-paper"
            title="Download financial report as PDF"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-[1.5px] border-paper/40 border-t-paper rounded-full animate-spin" />
                <span>Composing report</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Print this issue</span>
                <Download className="w-3.5 h-3.5 opacity-60 transition-transform group-hover:translate-y-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      <AnalyticsSummary data={data} />

      <div>
        <p className="eyebrow mb-4">The Charts &middot; Trend &amp; Composition</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NetIncomeTrendChart data={data} />
          <SpendingTrendChart expenses={data.expenses} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryPieChart expenses={data.expenses} />
        <IncomeVsExpenseChart data={data} />
      </div>
    </div>
  );
};

export default AnalyticsView;
