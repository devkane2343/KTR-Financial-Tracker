import React, { useState, useEffect } from 'react';
import { Bill, BillCategory } from '../types';
import { Card } from './UI/Card';
import { generateId, getLocalDateString } from '../lib/utils';
import { PlusCircle, Save, X, Calendar, Hash } from 'lucide-react';

interface BillFormProps {
  onAdd: (bill: Bill) => void;
  onUpdate?: (bill: Bill) => void;
  editingBill?: Bill | null;
  onCancelEdit?: () => void;
}

const CATEGORIES: BillCategory[] = ['Insurance', 'Utilities', 'Rent', 'Internet', 'Loan', 'Other'];

export const BillForm: React.FC<BillFormProps> = ({ onAdd, onUpdate, editingBill, onCancelEdit }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillCategory>('Utilities');
  const [dueDate, setDueDate] = useState(getLocalDateString());
  const [totalPayments, setTotalPayments] = useState('');

  useEffect(() => {
    if (editingBill) {
      setName(editingBill.name);
      setAmount(editingBill.amount.toString());
      setCategory(editingBill.category);
      setDueDate(editingBill.dueDate);
      setTotalPayments(editingBill.totalPayments?.toString() ?? '');
    } else {
      setName('');
      setAmount('');
      setCategory('Utilities');
      setDueDate(getLocalDateString());
      setTotalPayments('');
    }
  }, [editingBill]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (!name.trim() || parsedAmount <= 0 || !dueDate) return;

    const parsedTotal = parseInt(totalPayments, 10);
    const bill: Bill = {
      id: editingBill ? editingBill.id : generateId(),
      name: name.trim(),
      amount: parsedAmount,
      category,
      dueDate,
      totalPayments: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : undefined,
      active: editingBill?.active ?? true,
    };

    if (editingBill && onUpdate) onUpdate(bill);
    else onAdd(bill);

    if (!editingBill) {
      setName('');
      setAmount('');
      setCategory('Utilities');
      setDueDate(getLocalDateString());
      setTotalPayments('');
    }
  };

  return (
    <div className={`relative bg-paper rounded-2xl shadow-paper overflow-hidden transition-all ${editingBill ? 'ring-1 ring-gold-300 shadow-paper-lift' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-jade-500 via-gold-400 to-coral-400" />
      <div className="px-6 pt-6 pb-4 border-b border-rule flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">{editingBill ? 'Revising entry' : 'New entry'}</p>
          <h2 className="font-display text-2xl text-ink leading-tight">
            {editingBill ? 'Edit Obligation' : 'Record Obligation'}
          </h2>
        </div>
        {editingBill && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="p-1.5 hover:bg-ink/5 rounded-full text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="eyebrow mb-1.5 block">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-0 py-2 bg-transparent border-0 border-b border-rule focus:border-ink focus:ring-0 outline-none font-display text-lg text-ink placeholder:text-ink-whisper transition-colors"
            placeholder="Sunlife, Meralco, PLDT"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="eyebrow mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
              className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none text-sm text-ink transition-colors"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="eyebrow mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-mono">₱</span>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none num text-sm text-ink transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> Next Due Date
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none text-sm text-ink transition-colors"
          />
          <p className="mt-1.5 text-[11px] text-ink-muted leading-relaxed">
            Auto-advances by one month with each payment.
          </p>
        </div>

        <div>
          <label className="eyebrow mb-1.5 flex items-center gap-1.5">
            <Hash className="w-3 h-3" /> Total Payments <span className="text-ink-whisper normal-case tracking-normal text-[10px] ml-1">(optional)</span>
          </label>
          <input
            type="number"
            min={1}
            value={totalPayments}
            onChange={(e) => setTotalPayments(e.target.value)}
            className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none num text-sm text-ink transition-colors"
            placeholder="e.g. 12 for a 12-month loan"
          />
          <p className="mt-1.5 text-[11px] text-ink-muted leading-relaxed">
            Leave blank if recurring forever. For loans, the bill marks itself paid off after this many payments.
          </p>
        </div>

        <button
          type="submit"
          className="group w-full py-3 bg-ink hover:bg-jade-500 text-paper rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
        >
          {editingBill ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingBill ? 'Save revisions' : 'File this obligation'}</span>
        </button>
      </form>
    </div>
  );
};
