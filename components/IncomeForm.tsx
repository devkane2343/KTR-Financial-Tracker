
import React, { useState, useEffect } from 'react';
import { IncomeEntry, Bill, BillPayment, PaidBill } from '../types';
import { formatCurrency, getNetIncome, generateId, getLocalDateString, isBillPaidThisMonth, isBillPaidOff } from '../lib/utils';
import { PlusCircle, Calendar, Save, X, Receipt, AlertTriangle } from 'lucide-react';

interface IncomeFormProps {
  onAdd: (income: IncomeEntry) => void;
  onUpdate?: (income: IncomeEntry) => void;
  editingEntry?: IncomeEntry | null;
  onCancelEdit?: () => void;
  bills?: Bill[];
  payments?: BillPayment[];
}

export const IncomeForm: React.FC<IncomeFormProps> = ({ onAdd, onUpdate, editingEntry, onCancelEdit, bills = [], payments = [] }) => {
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    weeklySalary: '',
    sss: '',
    pagibig: '',
    philhealth: '',
    vul: '',
    emergencyFund: '',
    generalSavings: ''
  });
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<{ billId: string; billName: string; paidDate: string } | null>(null);

  useEffect(() => {
    if (editingEntry) {
      setFormData({
        date: editingEntry.date,
        weeklySalary: editingEntry.weeklySalary.toString(),
        sss: editingEntry.sss.toString(),
        pagibig: editingEntry.pagibig.toString(),
        philhealth: editingEntry.philhealth.toString(),
        vul: editingEntry.vul.toString(),
        emergencyFund: editingEntry.emergencyFund?.toString() ?? '',
        generalSavings: editingEntry.generalSavings?.toString() ?? '',
      });
      const paidIds = new Set((editingEntry.paidBills ?? []).map(pb => pb.billId));
      setSelectedBills(paidIds);
    } else {
      setFormData({
        date: getLocalDateString(),
        weeklySalary: '', sss: '', pagibig: '', philhealth: '', vul: '', emergencyFund: '', generalSavings: ''
      });
      setSelectedBills(new Set());
    }
  }, [editingEntry]);

  const toggleBill = (bill: Bill) => {
    if (selectedBills.has(bill.id)) {
      setSelectedBills(prev => { const next = new Set(prev); next.delete(bill.id); return next; });
    } else {
      if (isBillPaidThisMonth(bill.id, payments)) {
        const existing = payments.find(p => p.billId === bill.id);
        setDuplicateWarning({ billId: bill.id, billName: bill.name, paidDate: existing?.paidDate ?? existing?.dueDate ?? '' });
        return;
      }
      setSelectedBills(prev => new Set([...prev, bill.id]));
    }
  };

  const confirmDuplicate = () => {
    if (duplicateWarning) {
      setSelectedBills(prev => new Set([...prev, duplicateWarning.billId]));
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salary = parseFloat(formData.weeklySalary) || 0;
    if (salary <= 0) return;
    const paidBills: PaidBill[] = bills
      .filter(b => selectedBills.has(b.id))
      .map(b => ({ billId: b.id, name: b.name, amount: b.amount }));
    const entryData: IncomeEntry = {
      id: editingEntry ? editingEntry.id : generateId(),
      date: formData.date,
      weeklySalary: salary,
      sss: parseFloat(formData.sss) || 0,
      pagibig: parseFloat(formData.pagibig) || 0,
      philhealth: parseFloat(formData.philhealth) || 0,
      vul: parseFloat(formData.vul) || 0,
      emergencyFund: parseFloat(formData.emergencyFund) || 0,
      generalSavings: parseFloat(formData.generalSavings) || 0,
      paidBills: paidBills.length > 0 ? paidBills : undefined,
    };
    if (editingEntry && onUpdate) onUpdate(entryData);
    else onAdd(entryData);
    if (!editingEntry) {
      setFormData({ date: getLocalDateString(), weeklySalary: '', sss: '', pagibig: '', philhealth: '', vul: '', emergencyFund: '', generalSavings: '' });
      setSelectedBills(new Set());
    }
  };

  const billsTotal = bills.filter(b => selectedBills.has(b.id)).reduce((sum, b) => sum + b.amount, 0);

  const currentNet = getNetIncome({
    weeklySalary: parseFloat(formData.weeklySalary) || 0,
    sss: parseFloat(formData.sss) || 0,
    pagibig: parseFloat(formData.pagibig) || 0,
    philhealth: parseFloat(formData.philhealth) || 0,
    vul: parseFloat(formData.vul) || 0,
    emergencyFund: parseFloat(formData.emergencyFund) || 0,
    generalSavings: parseFloat(formData.generalSavings) || 0,
    paidBills: bills.filter(b => selectedBills.has(b.id)).map(b => ({ amount: b.amount })),
  });

  const labelClass = "text-xs font-medium text-ink-soft mb-1 block";
  const inputClass = "w-full px-3 py-2 bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none num text-sm text-ink placeholder:text-ink-whisper transition-all";

  return (
    <div className={`bg-paper rounded-xl border overflow-hidden transition-colors ${editingEntry ? 'border-jade-300' : 'border-rule'}`}>
      <div className="px-5 pt-5 pb-3 border-b border-rule flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted mb-0.5">{editingEntry ? 'Editing' : 'New entry'}</p>
          <h2 className="font-display text-lg text-ink tracking-tight">
            {editingEntry ? 'Edit paycheck' : 'Log paycheck'}
          </h2>
        </div>
        {editingEntry && onCancelEdit && (
          <button onClick={onCancelEdit} className="p-1.5 hover:bg-paper-soft rounded-md text-ink-muted hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div>
          <label className={labelClass}>
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Payroll date</span>
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* Featured: gross */}
        <div className="bg-paper-soft/60 rounded-lg p-3.5 border border-rule">
          <p className="text-xs font-medium text-ink-soft mb-1.5">Weekly gross salary</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-ink-muted font-mono text-xl">₱</span>
            <input
              type="number"
              required
              value={formData.weeklySalary}
              onChange={(e) => setFormData({ ...formData, weeklySalary: e.target.value })}
              className="flex-1 bg-transparent border-0 outline-none num text-2xl text-ink font-semibold placeholder:text-ink-whisper py-0.5"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Statutory deductions</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>SSS</label>
              <input type="number" value={formData.sss} onChange={(e) => setFormData({ ...formData, sss: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Pag-IBIG</label>
              <input type="number" value={formData.pagibig} onChange={(e) => setFormData({ ...formData, pagibig: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>PhilHealth</label>
              <input type="number" value={formData.philhealth} onChange={(e) => setFormData({ ...formData, philhealth: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>VUL / Insurance</label>
              <input type="number" value={formData.vul} onChange={(e) => setFormData({ ...formData, vul: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Voluntary set-asides</p>
            <span className="text-[10px] text-jade-700">pay yourself first</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Emergency fund</label>
              <input type="number" value={formData.emergencyFund} onChange={(e) => setFormData({ ...formData, emergencyFund: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>General savings</label>
              <input type="number" value={formData.generalSavings} onChange={(e) => setFormData({ ...formData, generalSavings: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
          </div>
        </div>

        {bills.filter(b => !isBillPaidOff(b, payments)).length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2 flex items-center gap-1.5">
              <Receipt className="w-3 h-3" /> Bills paid this paycheck
            </p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {bills.filter(b => !isBillPaidOff(b, payments)).map(bill => {
                const isChecked = selectedBills.has(bill.id);
                const alreadyPaid = isBillPaidThisMonth(bill.id, payments);
                return (
                  <label
                    key={bill.id}
                    className={`group flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-jade-300 bg-jade-50/60 dark:border-jade-700 dark:bg-jade-900/30'
                        : alreadyPaid
                          ? 'border-rule bg-paper-soft/40 opacity-60'
                          : 'border-rule hover:border-ink/15 bg-paper'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBill(bill)}
                        className="w-4 h-4 rounded border-ink/20 text-ink focus:ring-ink/10 focus:ring-offset-0"
                      />
                      <span className="text-sm text-ink">{bill.name}</span>
                      {alreadyPaid && !isChecked && (
                        <span className="text-[10px] text-jade-700 bg-jade-50 dark:bg-jade-900/50 dark:text-jade-300 px-1.5 py-0.5 rounded-md font-medium">Settled</span>
                      )}
                    </div>
                    <span className="num text-sm font-medium text-ink-soft">{formatCurrency(bill.amount)}</span>
                  </label>
                );
              })}
            </div>
            {billsTotal > 0 && (
              <div className="flex justify-between items-baseline mt-2.5 pt-2.5 border-t border-rule">
                <span className="text-xs text-ink-muted">Bills total</span>
                <span className="num text-sm font-medium text-coral-600">−{formatCurrency(billsTotal)}</span>
              </div>
            )}
          </div>
        )}

        {duplicateWarning && (
          <div className="p-3 bg-gold-50 dark:bg-gold-500/10 border border-gold-200 dark:border-gold-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-gold-600 dark:text-gold-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ink leading-relaxed">
                  <span className="font-medium">{duplicateWarning.billName}</span> already settled. Add anyway?
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button type="button" onClick={confirmDuplicate} className="px-3 py-1 bg-ink text-paper text-xs font-medium rounded-md hover:bg-ink-soft transition-colors">
                    Yes, add it
                  </button>
                  <button type="button" onClick={() => setDuplicateWarning(null)} className="px-3 py-1 bg-paper text-ink border border-rule text-xs font-medium rounded-md hover:bg-paper-soft transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Net display */}
        <div className="bg-ink text-paper rounded-lg p-4 flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wider text-paper/55">Net to take home</p>
          <p className="num text-xl font-semibold text-paper">{formatCurrency(currentNet)}</p>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-ink hover:bg-ink-soft text-paper rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {editingEntry ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingEntry ? 'Save changes' : 'Add paycheck'}</span>
        </button>
      </form>
    </div>
  );
};
