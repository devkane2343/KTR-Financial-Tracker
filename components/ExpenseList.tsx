
import React, { useState } from 'react';
import { Expense } from '../types';
import { CATEGORIES } from '../constants';
import { formatCurrency, formatDateString, isSavingsCategory } from '../lib/utils';
import { Trash2, Search, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (expense: Expense) => void;
}

// Category badge tones — neutral with one accent per family
const CATEGORY_TONE: Record<string, string> = {
  'Emergency Fund':   'bg-jade-50 text-jade-700',
  'General Savings':  'bg-jade-50 text-jade-700',
  'Life Insurance':   'bg-jade-50 text-jade-700',
  'Savings':          'bg-jade-50 text-jade-700',
  'Food':             'bg-paper-soft text-ink-soft',
  'Transportation':   'bg-paper-soft text-ink-soft',
  'Utilities':        'bg-paper-soft text-ink-soft',
  'Entertainment':    'bg-paper-soft text-ink-soft',
  'Bills':            'bg-paper-soft text-ink-soft',
  'Shopping':         'bg-paper-soft text-ink-soft',
  'Health':           'bg-paper-soft text-ink-soft',
  'Others':           'bg-paper-soft text-ink-soft',
};

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredExpenses = expenses
    .filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  const totalAmount = filteredExpenses
    .filter(e => !isSavingsCategory(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="bg-paper rounded-xl border border-rule overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-rule space-y-3">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-ink-muted mb-1">Spending records</p>
            <h2 className="font-display text-xl text-ink tracking-tight">Expenses</h2>
          </div>
          <div className="text-right">
            <p className="num text-base text-ink font-semibold">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-ink-muted mt-0.5">{filteredExpenses.length} {filteredExpenses.length === 1 ? 'record' : 'records'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-whisper" />
            <input
              type="text"
              placeholder="Search expenses…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-ink placeholder:text-ink-whisper transition-all"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-ink transition-all"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-[360px]">
        {paginatedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-base text-ink mb-1">No records found</p>
            <p className="text-sm text-ink-muted">Try a different filter, or log a new expense.</p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {paginatedExpenses.map((exp, idx) => {
              const tone = CATEGORY_TONE[exp.category] ?? 'bg-paper-soft text-ink-soft';
              return (
                <div
                  key={exp.id}
                  className="px-5 py-3.5 hover:bg-paper-soft/60 transition-colors stagger animate-fade-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 20}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-ink">{formatDateString(exp.date)}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${tone}`}>
                          {exp.category}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted leading-snug truncate" title={exp.description || undefined}>
                        {exp.description || <span className="italic text-ink-whisper">No description</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="num text-base font-semibold text-ink">{formatCurrency(exp.amount)}</p>
                      <div className="flex items-center gap-0.5 ml-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(exp)}
                            className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper-soft rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(exp.id)}
                          className="p-1.5 text-ink-muted hover:text-coral-600 hover:bg-coral-50 rounded-md transition-colors"
                          title="Delete"
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

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-rule flex items-center justify-between">
          <p className="text-xs text-ink-muted font-mono">
            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-paper-soft disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="num text-xs px-2 text-ink-muted">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md hover:bg-paper-soft disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
