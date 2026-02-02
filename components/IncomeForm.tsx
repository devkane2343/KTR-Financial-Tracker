
import React, { useState, useEffect } from 'react';
import { IncomeEntry } from '../types';
import { Card } from './UI/Card';
import { formatCurrency, getNetIncome, generateId, getLocalDateString } from '../lib/utils';
import { Wallet, PlusCircle, Calendar, Save, X } from 'lucide-react';

interface IncomeFormProps {
  onAdd: (income: IncomeEntry) => void;
  onUpdate?: (income: IncomeEntry) => void;
  editingEntry?: IncomeEntry | null;
  onCancelEdit?: () => void;
}

export const IncomeForm: React.FC<IncomeFormProps> = ({ onAdd, onUpdate, editingEntry, onCancelEdit }) => {
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
    } else {
      setFormData({
        date: getLocalDateString(),
        weeklySalary: '',
        sss: '',
        pagibig: '',
        philhealth: '',
        vul: '',
        emergencyFund: '',
        generalSavings: ''
      });
    }
  }, [editingEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salary = parseFloat(formData.weeklySalary) || 0;
    if (salary <= 0) return;

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
    };

    if (editingEntry && onUpdate) {
      onUpdate(entryData);
    } else {
      onAdd(entryData);
    }

    if (!editingEntry) {
      setFormData({
        date: getLocalDateString(),
        weeklySalary: '',
        sss: '',
        pagibig: '',
        philhealth: '',
        vul: '',
        emergencyFund: '',
        generalSavings: ''
      });
    }
  };

  const currentNet = getNetIncome({
    weeklySalary: parseFloat(formData.weeklySalary) || 0,
    sss: parseFloat(formData.sss) || 0,
    pagibig: parseFloat(formData.pagibig) || 0,
    philhealth: parseFloat(formData.philhealth) || 0,
    vul: parseFloat(formData.vul) || 0,
    emergencyFund: parseFloat(formData.emergencyFund) || 0,
    generalSavings: parseFloat(formData.generalSavings) || 0,
  });

  return (
    <Card className={editingEntry ? "ring-2 ring-emerald-500 shadow-lg" : ""}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-800">
            {editingEntry ? 'Edit Salary Record' : 'Log Salary'}
          </h2>
        </div>
        {editingEntry && onCancelEdit && (
          <button 
            onClick={onCancelEdit}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
            <Calendar className="w-3.5 h-3.5" /> Payroll Date
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weekly Gross Salary</label>
          <input
            type="number"
            required
            value={formData.weeklySalary}
            onChange={(e) => setFormData({ ...formData, weeklySalary: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-xs">SSS</label>
            <input
              type="number"
              value={formData.sss}
              onChange={(e) => setFormData({ ...formData, sss: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-xs">Pag-IBIG</label>
            <input
              type="number"
              value={formData.pagibig}
              onChange={(e) => setFormData({ ...formData, pagibig: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-xs">PhilHealth</label>
            <input
              type="number"
              value={formData.philhealth}
              onChange={(e) => setFormData({ ...formData, philhealth: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-xs">VUL / Insurance</label>
            <input
              type="number"
              value={formData.vul}
              onChange={(e) => setFormData({ ...formData, vul: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-xs">EF (Emergency Fund)</label>
            <input
              type="number"
              value={formData.emergencyFund}
              onChange={(e) => setFormData({ ...formData, emergencyFund: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 text-xs">General Savings</label>
            <input
              type="number"
              value={formData.generalSavings}
              onChange={(e) => setFormData({ ...formData, generalSavings: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
           <div className="flex justify-between items-center mb-4">
             <span className="text-sm font-medium text-slate-500">Net:</span>
             <span className="text-lg font-bold text-emerald-600">{formatCurrency(currentNet)}</span>
           </div>
           <button
            type="submit"
            className={`w-full py-2.5 ${editingEntry ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'} text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm`}
          >
            {editingEntry ? <Save className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            {editingEntry ? 'Update Record' : 'Add Salary Record'}
          </button>
        </div>
      </form>
    </Card>
  );
};
