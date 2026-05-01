
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

  const inputClass = "w-full px-0 py-1.5 bg-transparent border-0 border-b border-rule focus:border-ink focus:ring-0 outline-none num text-base text-ink placeholder:text-ink-whisper transition-colors";

  return (
    <div className={`relative bg-paper rounded-2xl shadow-paper overflow-hidden transition-all ${editingEntry ? 'ring-1 ring-jade-200 shadow-paper-lift' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-jade-500 via-gold-400 to-jade-500" />

      <div className="px-6 pt-6 pb-4 border-b border-rule flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">{editingEntry ? 'Revising entry' : 'New entry'}</p>
          <h2 className="font-display text-2xl text-ink leading-tight">
            {editingEntry ? 'Edit Paycheck' : 'Log Paycheck'}
          </h2>
        </div>
        {editingEntry && onCancelEdit && (
          <button onClick={onCancelEdit} className="p-1.5 hover:bg-ink/5 rounded-full text-ink-muted hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Payroll date */}
        <div>
          <label className="eyebrow mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> Payroll Date
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2.5 bg-paper-soft/60 border border-rule rounded-lg focus:border-ink focus:ring-0 outline-none text-sm text-ink transition-colors"
          />
        </div>

        {/* Weekly gross — featured */}
        <div className="bg-paper-soft/50 rounded-xl p-4 border border-rule">
          <p className="eyebrow mb-2">Weekly Gross Salary</p>
          <div className="flex items-baseline gap-2">
            <span className="text-ink-muted font-mono text-2xl">₱</span>
            <input
              type="number"
              required
              value={formData.weeklySalary}
              onChange={(e) => setFormData({ ...formData, weeklySalary: e.target.value })}
              className="flex-1 bg-transparent border-0 outline-none num text-3xl text-ink font-medium placeholder:text-ink-whisper py-1"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Statutory deductions */}
        <div>
          <p className="eyebrow mb-3">Statutory Deductions</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">SSS</label>
              <input type="number" value={formData.sss} onChange={(e) => setFormData({ ...formData, sss: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">Pag-IBIG</label>
              <input type="number" value={formData.pagibig} onChange={(e) => setFormData({ ...formData, pagibig: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">PhilHealth</label>
              <input type="number" value={formData.philhealth} onChange={(e) => setFormData({ ...formData, philhealth: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">VUL / Insurance</label>
              <input type="number" value={formData.vul} onChange={(e) => setFormData({ ...formData, vul: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Voluntary set-asides */}
        <div>
          <p className="eyebrow mb-3 flex items-center gap-2">
            Voluntary Set-Asides
            <span className="text-[9px] font-normal normal-case tracking-normal text-jade-500">— pay yourself first</span>
          </p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">Emergency Fund</label>
              <input type="number" value={formData.emergencyFund} onChange={(e) => setFormData({ ...formData, emergencyFund: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
            <div>
              <label className="text-[11px] text-ink-muted block mb-1">General Savings</label>
              <input type="number" value={formData.generalSavings} onChange={(e) => setFormData({ ...formData, generalSavings: e.target.value })} className={inputClass} placeholder="0.00" />
            </div>
          </div>
        </div>

        {/* Bills */}
        {bills.filter(b => !isBillPaidOff(b, payments)).length > 0 && (
          <div>
            <p className="eyebrow mb-3 flex items-center gap-1.5">
              <Receipt className="w-3 h-3" /> Bills paid this paycheck
            </p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {bills.filter(b => !isBillPaidOff(b, payments)).map(bill => {
                const isChecked = selectedBills.has(bill.id);
                const alreadyPaid = isBillPaidThisMonth(bill.id, payments);
                return (
                  <label
                    key={bill.id}
                    className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-jade-300 bg-jade-50/50'
                        : alreadyPaid
                          ? 'border-rule bg-paper-soft/30 opacity-60'
                          : 'border-rule hover:border-ink/20 bg-paper'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBill(bill)}
                        className="w-4 h-4 rounded border-ink/20 text-jade-500 focus:ring-jade-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-ink">{bill.name}</span>
                      {alreadyPaid && !isChecked && (
                        <span className="text-[9px] text-jade-700 bg-jade-50 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Settled</span>
                      )}
                    </div>
                    <span className="num text-sm font-medium text-ink-soft">{formatCurrency(bill.amount)}</span>
                  </label>
                );
              })}
            </div>
            {billsTotal > 0 && (
              <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-rule">
                <span className="eyebrow">Bills total</span>
                <span className="num text-sm font-medium text-coral-500">−{formatCurrency(billsTotal)}</span>
              </div>
            )}
          </div>
        )}

        {/* Duplicate warning */}
        {duplicateWarning && (
          <div className="p-4 bg-gold-50 border border-gold-200 rounded-xl">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ink leading-relaxed">
                  <span className="font-medium">{duplicateWarning.billName}</span> already settled. Add anyway?
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button type="button" onClick={confirmDuplicate} className="px-3 py-1 bg-ink text-paper text-xs font-medium rounded-full hover:bg-jade-500 transition-colors">
                    Yes, add it
                  </button>
                  <button type="button" onClick={() => setDuplicateWarning(null)} className="px-3 py-1 bg-ink/5 text-ink text-xs font-medium rounded-full hover:bg-ink/10 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Net display */}
        <div className="relative bg-ink text-paper rounded-2xl p-5 overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-jade-500/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-baseline justify-between">
            <p className="eyebrow text-paper/55">Net to take home</p>
            <p className="num text-2xl font-medium text-paper">{formatCurrency(currentNet)}</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-ink hover:bg-jade-500 text-paper rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
        >
          {editingEntry ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingEntry ? 'Save revisions' : 'File this paycheck'}</span>
        </button>
      </form>
    </div>
  );
};
