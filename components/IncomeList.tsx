
import React from 'react';
import { IncomeEntry } from '../types';
import { formatCurrency, getNetIncome, formatDateString } from '../lib/utils';
import { Trash2, Calendar, Edit2 } from 'lucide-react';

interface IncomeListProps {
  history: IncomeEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: IncomeEntry) => void;
}

export const IncomeList: React.FC<IncomeListProps> = ({ history, onDelete, onEdit }) => {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Salary History</h2>
        <span className="text-sm bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-medium">
          {history.length} Payrolls
        </span>
      </div>
      <div className="overflow-auto max-h-[500px]">
        {sorted.length > 0 ? (
          <table className="w-full min-w-[640px] text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Gross</th>
                <th className="px-6 py-3">Deductions</th>
                <th className="px-6 py-3">Net</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((item) => {
                const deductions = item.sss + item.pagibig + item.philhealth + item.vul + (item.emergencyFund ?? 0) + (item.generalSavings ?? 0);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateString(item.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{formatCurrency(item.weeklySalary)}</td>
                    <td className="px-6 py-4 text-sm text-red-500">-{formatCurrency(deductions)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(getNetIncome(item))}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => onEdit(item)} 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                          title="Edit record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(item.id)} 
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400 italic">No salary records yet.</div>
        )}
      </div>
    </div>
  );
};
