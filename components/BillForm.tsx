import React, { useState, useEffect } from 'react';
import { Bill, BillCategory } from '../types';
import { generateId, getLocalDateString } from '../lib/utils';
import { PlusCircle, Save, X, Calendar, Hash } from 'lucide-react';
import { Select } from './UI/Select';

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

  const labelClass = "text-xs font-medium text-ink-soft mb-1 block";
  const inputClass = "w-full px-3 py-2 bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-sm text-ink placeholder:text-ink-whisper transition-all";

  return (
    <div className={`bg-paper rounded-xl border overflow-hidden transition-colors ${editingBill ? 'border-gold-300' : 'border-rule'}`}>
      <div className="px-5 pt-5 pb-3 border-b border-rule flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted mb-0.5">{editingBill ? 'Editing' : 'New entry'}</p>
          <h2 className="font-display text-lg text-ink tracking-tight">
            {editingBill ? 'Edit bill' : 'Add bill'}
          </h2>
        </div>
        {editingBill && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="p-1.5 hover:bg-paper-soft rounded-md text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Sunlife, Meralco, PLDT…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Category</label>
            <Select
              aria-label="Category"
              value={category}
              onChange={(v) => setCategory(v as BillCategory)}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className={labelClass}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-mono">₱</span>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} pl-7 num`}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Next due date</span>
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Auto-advances by one month with each payment.
          </p>
        </div>

        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5"><Hash className="w-3 h-3" /> Total payments <span className="font-normal text-ink-whisper ml-1">(optional)</span></span>
          </label>
          <input
            type="number"
            min={1}
            value={totalPayments}
            onChange={(e) => setTotalPayments(e.target.value)}
            className={`${inputClass} num`}
            placeholder="e.g. 12 for a 12-month loan"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Leave blank if recurring. For loans, the bill auto-completes after this many payments.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-ink hover:bg-ink-soft text-paper rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {editingBill ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingBill ? 'Save changes' : 'Add bill'}</span>
        </button>
      </form>
    </div>
  );
};
