
import React from 'react';
import { IncomeEntry } from '../types';
import { formatCurrency, getNetIncome, getDeductionsForEntry, formatDateString } from '../lib/utils';
import { Trash2, Edit2 } from 'lucide-react';

interface IncomeListProps {
  history: IncomeEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: IncomeEntry) => void;
}

export const IncomeList: React.FC<IncomeListProps> = ({ history, onDelete, onEdit }) => {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const total = sorted.reduce((sum, item) => sum + getNetIncome(item), 0);

  return (
    <div className="bg-paper rounded-xl border border-rule overflow-hidden flex flex-col">
      <div className="p-5 border-b border-rule">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-ink-muted mb-1">Salary history</p>
            <h2 className="font-display text-xl text-ink tracking-tight">Income</h2>
          </div>
          <div className="text-right">
            <p className="num text-base text-ink font-semibold">{formatCurrency(total)}</p>
            <p className="text-xs text-ink-muted mt-0.5">{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'} &middot; net</p>
          </div>
        </div>
      </div>

      <div className="overflow-auto max-h-[640px]">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base text-ink mb-1">No income yet</p>
            <p className="text-sm text-ink-muted">Log your first paycheck to begin tracking.</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {sorted.map((item, idx) => {
              const deductions = getDeductionsForEntry(item);
              const net = getNetIncome(item);
              return (
                <div
                  key={item.id}
                  className="group px-5 py-4 hover:bg-paper-soft/60 transition-colors stagger animate-fade-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 25}ms` }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink leading-tight">{formatDateString(item.date)}</p>
                      <div className="mt-1.5 flex items-baseline gap-x-4 gap-y-1 flex-wrap text-xs text-ink-muted">
                        <span>
                          Gross <span className="num text-ink-soft ml-1">{formatCurrency(item.weeklySalary)}</span>
                        </span>
                        <span>
                          Deductions <span className="num text-coral-600 ml-1">−{formatCurrency(deductions)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-0.5">Net</p>
                        <p className="num text-lg font-semibold text-jade-700">{formatCurrency(net)}</p>
                      </div>
                      <div className="flex items-center gap-0.5 ml-1">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2.5 sm:p-1.5 text-ink-muted hover:text-ink hover:bg-paper-soft rounded-md transition-colors"
                          title="Edit record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2.5 sm:p-1.5 text-ink-muted hover:text-coral-600 hover:bg-coral-50 rounded-md transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
