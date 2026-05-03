
import React, { useState, useEffect } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../constants';
import { generateId, getLocalDateString } from '../lib/utils';
import { PlusCircle, Calendar, Save, X } from 'lucide-react';

interface ExpenseFormProps {
  onAdd: (expense: Expense) => void;
  onUpdate?: (expense: Expense) => void;
  editingExpense?: Expense | null;
  onCancelEdit?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd, onUpdate, editingExpense, onCancelEdit }) => {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    category: Category.Food,
    amount: '',
    description: ''
  });

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        date: editingExpense.date,
        category: editingExpense.category,
        amount: editingExpense.amount.toString(),
        description: editingExpense.description || ''
      });
    } else {
      setFormData({ date: getLocalDateString(), category: Category.Food, amount: '', description: '' });
    }
  }, [editingExpense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;
    const expense: Expense = {
      id: editingExpense ? editingExpense.id : generateId(),
      date: formData.date,
      category: formData.category as Category,
      amount: parseFloat(formData.amount),
      description: formData.description
    };
    if (editingExpense && onUpdate) onUpdate(expense);
    else onAdd(expense);
    if (!editingExpense) setFormData({ ...formData, amount: '', description: '' });
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
          <button onClick={onCancelEdit} className="p-1.5 hover:bg-paper-soft rounded-md text-ink-muted hover:text-ink transition-colors">
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
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
              className={inputClass}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
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
          className="w-full py-2.5 bg-ink hover:bg-ink-soft text-paper rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {editingExpense ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingExpense ? 'Save changes' : 'Add expense'}</span>
        </button>
      </form>
    </div>
  );
};
