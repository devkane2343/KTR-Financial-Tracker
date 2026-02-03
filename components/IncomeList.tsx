
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
          <>
            {/* Desktop Table View */}
            <table className="hidden md:table w-full min-w-[800px] text-left table-fixed">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-6 py-3 w-[200px]">Date</th>
                  <th className="px-6 py-3 w-[140px]">Gross</th>
                  <th className="px-6 py-3 w-[140px]">Deductions</th>
                  <th className="px-6 py-3 w-[140px]">Net</th>
                  <th className="px-6 py-3 text-center w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((item) => {
                  const deductions = item.sss + item.pagibig + item.philhealth + item.vul + (item.emergencyFund ?? 0) + (item.generalSavings ?? 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {sorted.map((item) => {
                const deductions = item.sss + item.pagibig + item.philhealth + item.vul + (item.emergencyFund ?? 0) + (item.generalSavings ?? 0);
                return (
                  <div 
                    key={item.id} 
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateString(item.date)}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Gross Salary</span>
                        <span className="text-sm font-medium text-slate-700">{formatCurrency(item.weeklySalary)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Deductions</span>
                        <span className="text-sm text-red-500">-{formatCurrency(deductions)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">Net Income</span>
                        <span className="text-lg font-bold text-emerald-600">{formatCurrency(getNetIncome(item))}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => onEdit(item)} 
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button 
                        onClick={() => onDelete(item.id)} 
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400 italic">No salary records yet.</div>
        )}
      </div>
    </div>
  );
};
