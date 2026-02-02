import { IncomeEntry } from '../types';

/** Today's date as YYYY-MM-DD in local time (for form defaults). Avoids UTC shift. */
export const getLocalDateString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Format a YYYY-MM-DD date string for display without timezone shift. */
export const formatDateString = (dateStr: string): string => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

/** Total deductions for one salary entry (SSS, Pag-IBIG, PhilHealth, VUL, EF, General Savings). */
export const getDeductionsForEntry = (income: IncomeEntry | { sss: number; pagibig: number; philhealth: number; vul: number; emergencyFund?: number; generalSavings?: number }): number => {
  return (income.sss || 0) + (income.pagibig || 0) + (income.philhealth || 0) + (income.vul || 0) + (income.emergencyFund || 0) + (income.generalSavings || 0);
};

export const getNetIncome = (income: IncomeEntry | { weeklySalary: number; sss: number; pagibig: number; philhealth: number; vul: number; emergencyFund?: number; generalSavings?: number }): number => {
  const totalDeductions = getDeductionsForEntry(income);
  return Math.max(0, income.weeklySalary - totalDeductions);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
