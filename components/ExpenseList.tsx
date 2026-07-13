
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Expense } from '../types';
import { CATEGORIES } from '../constants';
import { formatCurrency, formatDateString, isSavingsCategory } from '../lib/utils';
import { Trash2, Search, ChevronLeft, ChevronRight, Pencil, CalendarDays, PieChart as PieIcon, Receipt } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const formatMonthLabel = (yyyyMM: string) => {
  const [y, m] = yyyyMM.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const PALETTE = [
  '#09090b', '#10b981', '#f59e0b', '#ef4444',
  '#52525b', '#059669', '#a1a1aa', '#d97706', '#71717a', '#27272a',
];
const PALETTE_DARK = [
  '#fafafa', '#10b981', '#f59e0b', '#ef4444',
  '#a1a1aa', '#34d399', '#71717a', '#fbbf24', '#d4d4d8', '#e4e4e7',
];

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (expense: Expense) => void;
}

// Category badge tones — light/dark variants for both palette families
const CATEGORY_TONE: Record<string, string> = {
  'Emergency Fund':   'bg-jade-50 text-jade-700 dark:bg-jade-900/50 dark:text-jade-300',
  'General Savings':  'bg-jade-50 text-jade-700 dark:bg-jade-900/50 dark:text-jade-300',
  'Life Insurance':   'bg-jade-50 text-jade-700 dark:bg-jade-900/50 dark:text-jade-300',
  'Savings':          'bg-jade-50 text-jade-700 dark:bg-jade-900/50 dark:text-jade-300',
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
  const theme = useTheme();
  const isDark = theme === 'dark';
  const palette = isDark ? PALETTE_DARK : PALETTE;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [showChart, setShowChart] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map(exp => exp.date.slice(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const filteredExpenses = useMemo(() => expenses
    .filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
      const matchesMonth = filterMonth === 'All' || exp.date.startsWith(filterMonth);
      return matchesSearch && matchesCategory && matchesMonth;
    })
    .sort((a, b) => b.date.localeCompare(a.date)),
  [expenses, searchTerm, filterCategory, filterMonth]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  const totalAmount = filteredExpenses
    .filter(e => !isSavingsCategory(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses
      .filter(e => !isSavingsCategory(e.category))
      .forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  return (
    <div className="bg-paper rounded-xl border border-rule overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-rule space-y-3">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-ink-muted mb-1">Spending records</p>
            <h2 className="font-display text-xl text-ink tracking-tight">Expenses</h2>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <p className="num text-base text-ink font-semibold">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'record' : 'records'}
                {filterMonth !== 'All' && (
                  <span className="ml-1 text-ink-whisper">· {formatMonthLabel(filterMonth)}</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowChart(v => !v)}
              title={showChart ? 'Hide chart' : 'Show chart'}
              className={`p-2.5 sm:p-1.5 rounded-md transition-colors ${showChart ? 'text-ink bg-paper-soft' : 'text-ink-muted hover:text-ink hover:bg-paper-soft'}`}
            >
              <PieIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-whisper" />
            <input
              type="text"
              placeholder="Search expenses…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-paper dark:bg-paper text-ink dark:text-ink border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none placeholder:text-ink-whisper transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-whisper pointer-events-none" />
              <select
                value={filterMonth}
                onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-paper dark:bg-paper text-ink dark:text-ink border rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none transition-all ${filterMonth !== 'All' ? 'border-ink/30' : 'border-rule'}`}
              >
                <option value="All">All months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className={`px-3 py-2 text-sm bg-paper dark:bg-paper text-ink dark:text-ink border rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none transition-all ${filterCategory !== 'All' ? 'border-ink/30' : 'border-rule'}`}
            >
              <option value="All">All categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* Pie chart panel — full-width on mobile (top), right sidebar on desktop */}
        {showChart && chartData.length > 0 && (
          <div className="w-full lg:w-96 shrink-0 border-b lg:border-b-0 lg:border-l border-rule lg:overflow-auto">
            <div className="p-5 flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-3 self-start">By category</p>

              {/* Chart */}
              <div className="relative w-full h-56 sm:h-72 lg:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="38%"
                      outerRadius="58%"
                      paddingAngle={3}
                      dataKey="value"
                      stroke={isDark ? '#0a0a0b' : '#ffffff'}
                      strokeWidth={3}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={palette[i % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        background: isDark ? '#fafafa' : '#09090b',
                        color: isDark ? '#09090b' : '#ffffff',
                        fontSize: '12px',
                        boxShadow: '0 8px 24px -12px rgba(0,0,0,0.30)',
                      }}
                      itemStyle={{ color: isDark ? '#09090b' : '#ffffff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="num text-lg sm:text-xl font-semibold text-ink leading-none">{formatCurrency(totalAmount)}</p>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1.5">total</p>
                </div>
              </div>

              {/* Legend — 2-col grid on mobile, single col on desktop */}
              <div className="w-full mt-4 grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-2.5">
                {chartData.map((entry, i) => {
                  const pct = totalAmount > 0 ? (entry.value / totalAmount) * 100 : 0;
                  return (
                    <div key={entry.name} className="flex items-center justify-between gap-2 min-w-0">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette[i % palette.length] }} />
                        <span className="text-xs text-ink truncate">{entry.name}</span>
                      </span>
                      <span className="flex items-baseline gap-1 shrink-0">
                        <span className="num text-xs font-medium text-ink">{formatCurrency(entry.value)}</span>
                        <span className="num text-[11px] text-ink-muted">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Expense rows */}
        <div className="flex-1 overflow-auto min-h-[240px]">
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
                    className="px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-paper-soft/60 transition-colors stagger animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx, 8) * 20}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium text-ink">{formatDateString(exp.date)}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${tone}`}>
                            {exp.category}
                          </span>
                        </div>
                        <p className="text-sm text-ink-muted leading-snug truncate" title={exp.description || undefined}>
                          {exp.description || <span className="italic text-ink-whisper">No description</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <p className="num text-sm sm:text-base font-semibold text-ink">{formatCurrency(exp.amount)}</p>
                        {exp.isBillPayment ? (
                          // Bill payments are managed on the Bills tab — read-only here.
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-ink-muted"
                            title="From a paid bill — manage it on the Bills tab"
                          >
                            <Receipt className="w-3 h-3" />
                            <span className="hidden sm:inline">Bill</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-0.5">
                            {onEdit && (
                              <button
                                onClick={() => onEdit(exp)}
                                className="p-2.5 sm:p-1.5 text-ink-muted hover:text-ink hover:bg-paper-soft rounded-md transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(exp.id)}
                              className="p-2.5 sm:p-1.5 text-ink-muted hover:text-coral-600 hover:bg-coral-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
              className="p-2.5 sm:p-1.5 rounded-md hover:bg-paper-soft disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="num text-xs px-2 text-ink-muted">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 sm:p-1.5 rounded-md hover:bg-paper-soft disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
