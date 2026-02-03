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

const LOGO_URL = '/logo.png';

interface AnalyticsViewProps {
  data: FinancialData;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Get user info for the PDF
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.email || 'User';
      
      // Generate and download PDF (now async)
      await generateFinancialReportPDF(data, userName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-1 rounded-full w-8 h-8 flex items-center justify-center">
            <img src={LOGO_URL} className="w-6 h-6 invert" alt="Analytics Icon" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Visual Insights</h2>
        </div>
        
        <button
          onClick={handleExportPDF}
          disabled={isExporting || (data.incomeHistory.length === 0 && data.expenses.length === 0)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium text-sm"
          title="Download Comprehensive Financial Report"
        >
          {isExporting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <FileText className="w-4 h-4" />
              <span>Export PDF Report</span>
            </>
          )}
        </button>
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
};

export default AnalyticsView;
