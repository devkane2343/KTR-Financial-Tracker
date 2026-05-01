
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

  return (
    <div className={`relative bg-paper rounded-2xl shadow-paper overflow-hidden transition-all ${editingExpense ? 'ring-1 ring-coral-200 shadow-paper-lift' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-coral-400 via-gold-400 to-jade-500" />

      <div className="px-6 pt-6 pb-4 border-b border-rule flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">{editingExpense ? 'Revising entry' : 'New entry'}</p>
          <h2 className="font-display text-2xl text-ink leading-tight">
            {editingExpense ? 'Edit Expense' : 'Record Expense'}
          </h2>
        </div>
        {editingExpense && onCancelEdit && (
          <button onClick={onCancelEdit} className="p-1.5 hover:bg-ink/5 rounded-full text-ink-muted hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Featured amount */}
        <div className="bg-paper-soft/50 rounded-xl p-4 border border-rule">
          <p className="eyebrow mb-2">Amount Spent</p>
          <div className="flex items-baseline gap-2">
            <span className="text-ink-muted font-mono text-2xl">₱</span>
            <input
              type="number"
              required
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="flex-1 bg-transparent border-0 outline-none num text-3xl text-ink font-medium placeholder:text-ink-whisper py-1"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="eyebrow mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none text-sm text-ink transition-colors"
            />
          </div>
          <div>
            <label className="eyebrow mb-1.5 block">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
              className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none text-sm text-ink transition-colors"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Notes <span className="normal-case tracking-normal text-[10px] text-ink-whisper ml-1">(optional)</span></label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none text-sm text-ink resize-none transition-colors placeholder:text-ink-whisper"
            placeholder="What was this for? Coffee, fare, groceries…"
            rows={2}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-ink hover:bg-coral-500 text-paper rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
        >
          {editingExpense ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingExpense ? 'Save revisions' : 'File this expense'}</span>
        </button>
      </form>
    </div>
  );
};
