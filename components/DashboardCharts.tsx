
import React, { useMemo } from 'react';
import { FinancialData } from '../types';
import { SpendingTrendChart } from './Charts/SpendingTrendChart';
import { CategoryPieChart } from './Charts/CategoryPieChart';
import { IncomeVsExpenseChart } from './Charts/IncomeVsExpenseChart';
import { NetIncomeTrendChart } from './Charts/NetIncomeTrendChart';
import {
  getBillStatus,
  daysBetween,
  getLocalDateString,
  formatCurrency,
  formatDateString,
  isBillPaidOff,
} from '../lib/utils';
import { AlertCircle, Clock, CheckCircle, CreditCard } from 'lucide-react';

interface DashboardChartsProps {
  data: FinancialData;
  onGoToBills: () => void;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data, onGoToBills }) => {
  const today = getLocalDateString();

  const upcomingBills = useMemo(() => {
    return data.bills
      .filter(b => !isBillPaidOff(b, data.billPayments))
      .map(b => ({ bill: b, status: getBillStatus(b, data.billPayments, today), days: daysBetween(today, b.dueDate) }))
      .filter(({ status }) => status !== 'paid-off' && status !== 'paid-ahead')
      .sort((a, b) => a.bill.dueDate.localeCompare(b.bill.dueDate))
      .slice(0, 5);
  }, [data.bills, data.billPayments, today]);

  const billsTotal = upcomingBills.reduce((s, { bill }) => s + bill.amount, 0);
  const overdueCount = upcomingBills.filter(({ status }) => status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Row 1: Income vs Expense + Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <IncomeVsExpenseChart data={data} />
        </div>

        {/* Upcoming Bills widget */}
        <div className="lg:col-span-4">
          <div className="bg-paper rounded-xl border border-rule overflow-hidden h-full flex flex-col">
            <div className="px-5 pt-5 pb-3 border-b border-rule flex items-start justify-between">
              <div>
                <p className="text-xs text-ink-muted mb-0.5">Next obligations</p>
                <h3 className="font-display text-lg text-ink tracking-tight">Upcoming bills</h3>
              </div>
              <div className="text-right">
                <p className="num text-base text-ink font-semibold">{formatCurrency(billsTotal)}</p>
                {overdueCount > 0 && (
                  <p className="text-[11px] text-coral-500 mt-0.5 flex items-center gap-1 justify-end">
                    <AlertCircle className="w-3 h-3" />{overdueCount} overdue
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 divide-y divide-rule">
              {upcomingBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <CheckCircle className="w-7 h-7 text-jade-500 mb-2" />
                  <p className="text-sm text-ink font-medium">All caught up</p>
                  <p className="text-xs text-ink-muted mt-0.5">No bills due soon.</p>
                </div>
              ) : (
                upcomingBills.map(({ bill, status, days }) => {
                  const isOverdue = status === 'overdue';
                  const isDueSoon = status === 'due-soon';
                  const dueLabel = isOverdue
                    ? `${Math.abs(days)}d overdue`
                    : days === 0 ? 'Due today'
                    : days === 1 ? 'Due tomorrow'
                    : `${days}d away`;

                  return (
                    <div key={bill.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{bill.name}</p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                          isOverdue ? 'text-coral-500 dark:text-coral-400'
                          : isDueSoon ? 'text-gold-600 dark:text-gold-400'
                          : 'text-ink-muted'
                        }`}>
                          <Clock className="w-3 h-3 shrink-0" />
                          {dueLabel}
                        </p>
                      </div>
                      <p className="num text-sm font-semibold text-ink shrink-0">{formatCurrency(bill.amount)}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-rule">
              <button
                onClick={onGoToBills}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors py-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Manage all bills
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Net Income Trend + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetIncomeTrendChart data={data} />
        <CategoryPieChart expenses={data.expenses} />
      </div>

      {/* Row 3: Spending Trend full width */}
      <SpendingTrendChart expenses={data.expenses} />
    </div>
  );
};
