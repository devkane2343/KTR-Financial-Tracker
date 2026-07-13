import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { FinancialData } from '../types';
import { AnalyticsSummary } from './AnalyticsSummary';
import { SpendingTrendChart } from './Charts/SpendingTrendChart';
import { CategoryPieChart } from './Charts/CategoryPieChart';
import { IncomeVsExpenseChart } from './Charts/IncomeVsExpenseChart';
import { NetIncomeTrendChart } from './Charts/NetIncomeTrendChart';
import { Download, FileText, Calendar, ChevronDown, Check } from 'lucide-react';
import { generateFinancialReportPDF, type NetWorthSnapshot } from '../lib/pdfExport';
import { withBillExpenses } from '../lib/utils';
import { loadWalletBalances } from '../lib/walletStore';
import { loadCustomSavingsAccounts } from '../lib/customSavingsStore';
import { supabase } from '../lib/supabase';

interface AnalyticsViewProps {
  data: FinancialData;
}

type Period = { type: 'all' } | { type: 'month'; year: number; month: number };

const formatPeriodLabel = (period: Period): string => {
  if (period.type === 'all') return 'All time';
  return new Date(period.year, period.month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const filterDataForPeriod = (data: FinancialData, period: Period): FinancialData => {
  if (period.type === 'all') return data;
  const key = `${period.year}-${String(period.month).padStart(2, '0')}`;
  return {
    incomeHistory: data.incomeHistory.filter((i) => i.date.startsWith(key)),
    expenses: data.expenses.filter((e) => e.date.startsWith(key)),
    bills: data.bills,
    billPayments: data.billPayments.filter((p) => p.paidDate.startsWith(key)),
  };
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState<Period>({ type: 'all' });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build sorted list of available months (YYYY-MM, newest first), grouped by year
  const groupedMonths = useMemo(() => {
    const set = new Set<string>();
    data.incomeHistory.forEach((i) => set.add(i.date.slice(0, 7)));
    data.expenses.forEach((e) => set.add(e.date.slice(0, 7)));
    data.billPayments.forEach((p) => set.add(p.paidDate.slice(0, 7)));
    const sorted = Array.from(set).sort().reverse(); // newest first

    const groups = new Map<number, { year: number; month: number; key: string }[]>();
    sorted.forEach((key) => {
      const [y, m] = key.split('-').map(Number);
      const list = groups.get(y) ?? [];
      list.push({ year: y, month: m, key });
      groups.set(y, list);
    });
    return Array.from(groups.entries()); // [[year, months[]]]
  }, [data]);

  // Bills-as-expenses: fold settled bill payments into `expenses` so the summary,
  // charts, and exported report all count them. Augment AFTER period filtering so
  // the synthetic rows aren't double-counted alongside the raw billPayments.
  const augmentedData = useMemo(() => withBillExpenses(data), [data]);
  const filteredData = useMemo(
    () => withBillExpenses(filterDataForPeriod(data, period)),
    [data, period],
  );
  const isPeriodEmpty =
    filteredData.incomeHistory.length === 0 && filteredData.expenses.length === 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userName = authData.user?.user_metadata?.full_name || authData.user?.email || 'User';

      // Net-worth balances are point-in-time (not period-scoped). Fetch them for
      // the report; degrade gracefully to a report without the section if either
      // load fails (e.g. table/bucket not migrated yet).
      let netWorth: NetWorthSnapshot | undefined;
      try {
        const [balances, accounts] = await Promise.all([
          loadWalletBalances(),
          loadCustomSavingsAccounts(),
        ]);
        if (balances.ok) {
          netWorth = {
            wallet: balances.balances.wallet,
            debit: balances.balances.debit,
            custom: accounts.ok
              ? accounts.value.map((a) => ({ name: a.name, balance: a.balance, liquidity: a.liquidity }))
              : [],
          };
        }
      } catch (nwErr) {
        console.warn('Could not load net-worth data for PDF:', nwErr);
      }

      await generateFinancialReportPDF(filteredData, userName, netWorth);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const isPeriodSelected = (p: Period): boolean => {
    if (p.type === 'all' && period.type === 'all') return true;
    if (p.type === 'month' && period.type === 'month') {
      return p.year === period.year && p.month === period.month;
    }
    return false;
  };

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    setDropdownOpen(false);
  };

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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-paper hover:bg-paper-soft border border-rule text-ink rounded-lg text-sm font-medium transition-colors"
              title="Select period for the report"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <Calendar className="w-4 h-4 text-ink-muted" />
              <span className="min-w-[88px] text-left">{formatPeriodLabel(period)}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div
                role="listbox"
                className="absolute right-0 mt-2 w-60 max-h-[360px] overflow-auto bg-paper rounded-xl border border-rule shadow-paper-lift z-50 animate-fade-up py-1"
              >
                {/* All time */}
                <button
                  onClick={() => selectPeriod({ type: 'all' })}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-ink hover:bg-paper-soft transition-colors"
                >
                  <span className="font-medium">All time</span>
                  {isPeriodSelected({ type: 'all' }) && <Check className="w-3.5 h-3.5 text-ink" />}
                </button>

                {groupedMonths.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-ink-muted">No monthly data yet</div>
                ) : (
                  groupedMonths.map(([year, months]) => (
                    <div key={year} className="border-t border-rule mt-1 pt-1">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-ink-muted font-medium">
                        {year}
                      </div>
                      {months.map((m) => {
                        const monthName = new Date(m.year, m.month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
                        const selected = isPeriodSelected({ type: 'month', year: m.year, month: m.month });
                        return (
                          <button
                            key={m.key}
                            onClick={() => selectPeriod({ type: 'month', year: m.year, month: m.month })}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-ink hover:bg-paper-soft transition-colors"
                          >
                            <span>{monthName}</span>
                            {selected && <Check className="w-3.5 h-3.5 text-ink" />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting || isPeriodEmpty}
            className="group inline-flex items-center gap-2 px-3.5 py-2 bg-ink text-paper rounded-lg hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            title={
              isPeriodEmpty
                ? `No data for ${formatPeriodLabel(period).toLowerCase()}`
                : `Download ${formatPeriodLabel(period).toLowerCase()} report as PDF`
            }
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
      </div>

      <AnalyticsSummary data={augmentedData} />

      <div>
        <h2 className="text-sm font-medium text-ink mb-3">Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NetIncomeTrendChart data={augmentedData} />
          <SpendingTrendChart expenses={augmentedData.expenses} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryPieChart expenses={augmentedData.expenses} />
        <IncomeVsExpenseChart data={augmentedData} />
      </div>
    </div>
  );
};

export default AnalyticsView;
