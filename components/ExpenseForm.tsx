
import React, { useState, useEffect } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../constants';
import { Card } from './UI/Card';
import { generateId, getLocalDateString } from '../lib/utils';
import { PlusCircle, Calendar, Tag, CreditCard, MessageSquare, Save, X } from 'lucide-react';

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
      setFormData({
        date: getLocalDateString(),
        category: Category.Food,
        amount: '',
        description: ''
      });
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

    if (editingExpense && onUpdate) {
      onUpdate(expense);
    } else {
      onAdd(expense);
    }

    if (!editingExpense) {
      setFormData({
        ...formData,
        amount: '',
        description: ''
      });
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {editingExpense ? (
            <Save className="w-5 h-5 text-emerald-600" />
          ) : (
            <PlusCircle className="w-5 h-5 text-emerald-600" />
          )}
          <h2 className="text-xl font-bold text-slate-800">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
        </div>
        {editingExpense && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all"
            title="Cancel edit"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
              <Tag className="w-3.5 h-3.5" /> Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
            <CreditCard className="w-3.5 h-3.5" /> Amount (PHP)
          </label>
          <input
            type="number"
            required
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
            <MessageSquare className="w-3.5 h-3.5" /> Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
            placeholder="What was this for?"
            rows={2}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
        >
          {editingExpense ? (
            <>
              <Save className="w-5 h-5" />
              Update Expense
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              Add Expense
            </>
          )}
        </button>
      </form>
    </Card>
  );
};
