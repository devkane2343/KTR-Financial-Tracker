
import React, { useState } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../constants';
import { formatCurrency, formatDateString } from '../lib/utils';
import { Trash2, Search, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit?: (expense: Expense) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredExpenses = expenses
    .filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            exp.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Expense History</h2>
          <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {filteredExpenses.length} records
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none bg-white"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-[400px]">
        {paginatedExpenses.length > 0 ? (
          <table className="w-full min-w-[720px] text-left table-fixed">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-3 w-[100px]">Date</th>
                <th className="px-6 py-3 w-[110px]">Category</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right w-[100px]">Amount</th>
                <th className="px-6 py-3 text-center w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateString(exp.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium truncate" title={exp.description || undefined}>
                    {exp.description || <span className="text-slate-400 italic">No description</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(exp)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                          title="Edit expense"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(exp.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg">No expenses found</p>
            <p className="text-sm">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredExpenses.length)}</span> of <span className="font-medium">{filteredExpenses.length}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium text-slate-600">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-md disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
