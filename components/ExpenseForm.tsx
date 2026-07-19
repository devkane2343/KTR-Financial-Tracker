
import React, { useState, useEffect } from 'react';
import { Expense, Category, ExpenseSource } from '../types';
import { CATEGORIES } from '../constants';
import { generateId, getLocalDateString, formatCurrency } from '../lib/utils';
import { PlusCircle, Calendar, Save, X, Wallet } from 'lucide-react';
import { Select } from './UI/Select';

/** A liquid pot the user can fund an expense from, with its current balance. */
export interface FundingSource {
  /** Stable key for the <option>: 'wallet' | 'debit' | 'savings:<bucket>' | 'custom:<id>'. */
  key: string;
  source: ExpenseSource;
  balance: number;
}

interface ExpenseFormProps {
  onAdd: (expense: Expense) => void;
  onUpdate?: (expense: Expense) => void;
  editingExpense?: Expense | null;
  onCancelEdit?: () => void;
  /** Liquid pots the expense can be paid from (Wallet, Debit, liquid savings). */
  fundingSources?: FundingSource[];
}

/** Rebuild the stable <option> key for a source, so editing pre-selects it. */
const sourceKey = (s: ExpenseSource): string =>
  s.kind === 'savings' ? `savings:${s.id}` : s.kind === 'custom' ? `custom:${s.id}` : s.kind;

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd, onUpdate, editingExpense, onCancelEdit, fundingSources = [] }) => {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    category: Category.Food,
    amount: '',
    description: ''
  });
  // Selected funding source, keyed by FundingSource.key. '' = "Don't track / none".
  // New expenses default to the Debit Card — it's the salary's point of entry, so
  // day-to-day spending is assumed to draw from it unless the user picks otherwise.
  const DEFAULT_SOURCE = 'debit';
  const [sourceKeySel, setSourceKeySel] = useState(DEFAULT_SOURCE);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        date: editingExpense.date,
        category: editingExpense.category,
        amount: editingExpense.amount.toString(),
        description: editingExpense.description || ''
      });
      setSourceKeySel(editingExpense.source ? sourceKey(editingExpense.source) : '');
    } else {
      setFormData({ date: getLocalDateString(), category: Category.Food, amount: '', description: '' });
      setSourceKeySel(DEFAULT_SOURCE);
    }
  }, [editingExpense]);

  // The picked source (if any) and whether the balance can cover this expense.
  const selected = fundingSources.find(s => s.key === sourceKeySel) ?? null;
  const amountNum = parseFloat(formData.amount);
  // When editing an expense that already drew from this same source, that draw is
  // already reflected in the balance — allow re-saving the same amount.
  const alreadyDrawn =
    editingExpense?.source && selected && sourceKey(editingExpense.source) === selected.key
      ? editingExpense.amount
      : 0;
  const available = selected ? selected.balance + alreadyDrawn : Infinity;
  const overspend = selected != null && Number.isFinite(amountNum) && amountNum > available;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;
    if (overspend) return;
    const expense: Expense = {
      id: editingExpense ? editingExpense.id : generateId(),
      date: formData.date,
      category: formData.category as Category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      // Snapshot the label so the list still reads right if the card is renamed.
      source: selected ? { ...selected.source } : undefined,
    };
    if (editingExpense && onUpdate) onUpdate(expense);
    else onAdd(expense);
    if (!editingExpense) { setFormData({ ...formData, amount: '', description: '' }); setSourceKeySel(DEFAULT_SOURCE); }
  };

  const labelClass = "text-xs font-medium text-ink-soft mb-1 block";
  const inputClass = "w-full px-3 py-2 bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-sm text-ink placeholder:text-ink-whisper transition-all";

  return (
    <div className={`bg-paper rounded-xl border overflow-hidden transition-colors ${editingExpense ? 'border-coral-300' : 'border-rule'}`}>
      <div className="px-5 pt-5 pb-3 border-b border-rule flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted mb-0.5">{editingExpense ? 'Editing' : 'New entry'}</p>
          <h2 className="font-display text-lg text-ink tracking-tight">
            {editingExpense ? 'Edit expense' : 'Add expense'}
          </h2>
        </div>
        {editingExpense && onCancelEdit && (
          <button onClick={onCancelEdit} className="p-2.5 -m-1 hover:bg-paper-soft rounded-md text-ink-muted hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="bg-paper-soft/60 rounded-lg p-3.5 border border-rule">
          <p className="text-xs font-medium text-ink-soft mb-1.5">Amount spent</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-ink-muted font-mono text-xl">₱</span>
            <input
              type="number"
              required
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="flex-1 bg-transparent border-0 outline-none num text-2xl text-ink font-semibold placeholder:text-ink-whisper py-0.5"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</span>
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <Select
              aria-label="Category"
              value={formData.category}
              onChange={(v) => setFormData({ ...formData, category: v as Category })}
              options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
            />
          </div>
        </div>

        {/* Paid from — which liquid pot funds this expense. Selecting one
            auto-deducts the amount from that pot's balance on save. */}
        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Paid from <span className="font-normal text-ink-whisper ml-1">(optional)</span></span>
          </label>
          <Select
            aria-label="Paid from"
            value={sourceKeySel}
            onChange={setSourceKeySel}
            className={overspend ? '!border-coral-400' : ''}
            options={[
              { value: '', label: "Don't deduct from a balance" },
              ...fundingSources.map(s => ({
                value: s.key,
                label: `${s.source.label} — ${formatCurrency(s.balance)} available`,
              })),
            ]}
          />
          {selected && !overspend && Number.isFinite(amountNum) && amountNum > 0 && (
            <p className="mt-1 text-[11px] text-ink-muted">
              Leaves {formatCurrency(available - amountNum)} in {selected.source.label}.
            </p>
          )}
          {overspend && (
            <p className="mt-1 text-[11px] text-coral-600">
              Only {formatCurrency(available)} available in {selected?.source.label}. Lower the amount or pick another source.
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Notes <span className="font-normal text-ink-whisper ml-1">(optional)</span></label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={`${inputClass} resize-none`}
            placeholder="What was this for?"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={overspend}
          className="w-full py-2.5 bg-ink hover:bg-ink-soft text-paper rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {editingExpense ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingExpense ? 'Save changes' : 'Add expense'}</span>
        </button>
      </form>
    </div>
  );
};
