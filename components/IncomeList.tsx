
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
    <div className="bg-paper rounded-2xl shadow-paper overflow-hidden flex flex-col">
      {/* Editorial header */}
      <div className="p-6 border-b border-rule">
        <div className="flex items-end justify-between mb-2 flex-wrap gap-2">
          <div>
            <p className="eyebrow mb-1">Section · Earnings</p>
            <h2 className="font-display text-3xl text-ink leading-tight">Salary History</h2>
          </div>
          <div className="text-right">
            <p className="num text-lg text-ink font-medium">{formatCurrency(total)}</p>
            <p className="eyebrow mt-0.5">{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'} · ∑ net</p>
          </div>
        </div>
      </div>

      <div className="overflow-auto max-h-[640px]">
        {sorted.length === 0 ? (
          <div className="p-16 text-center">
            <p className="font-display text-2xl text-ink-whisper italic mb-2">A blank ledger.</p>
            <p className="text-sm text-ink-muted">Log your first paycheck to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {sorted.map((item, idx) => {
              const deductions = getDeductionsForEntry(item);
              const net = getNetIncome(item);
              return (
                <div
                  key={item.id}
                  className="group px-6 py-5 hover:bg-paper-soft/40 transition-colors stagger animate-fade-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 35}ms` }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg text-ink leading-tight">{formatDateString(item.date)}</p>
                      <div className="mt-2 flex items-baseline gap-x-5 gap-y-1 flex-wrap text-xs">
                        <span className="text-ink-muted">
                          Gross <span className="num text-ink-soft ml-1">{formatCurrency(item.weeklySalary)}</span>
                        </span>
                        <span className="text-ink-muted">
                          Deductions <span className="num text-coral-500 ml-1">−{formatCurrency(deductions)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="eyebrow text-jade-500 mb-0.5">Net</p>
                        <p className="num text-xl font-medium text-jade-600">{formatCurrency(net)}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-ink-whisper hover:text-ink hover:bg-ink/5 rounded-full transition-all"
                          title="Edit record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 text-ink-whisper hover:text-coral-500 hover:bg-coral-50 rounded-full transition-all"
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
