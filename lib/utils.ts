import { IncomeEntry, Category, Expense } from '../types';

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
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const generateId = (): string => {
  return crypto.randomUUID();
};

/** Returns true if the expense is a savings category (Emergency Fund or General Savings). */
export const isSavingsCategory = (category: string): boolean =>
  category === Category.EmergencyFund || category === Category.GeneralSavings;

/** Filter out savings categories (EF & General Savings) from expenses to get actual expenses only. */
export const getActualExpenses = (expenses: Expense[]): Expense[] =>
  expenses.filter(e => !isSavingsCategory(e.category));

/** Helper to get YYYY-MM month key from a Date. */
const toMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Proportional monthly income values for a single entry whose 7-day pay period may span two months. */
export interface MonthlySlice {
  monthKey: string;
  ratio: number; // fraction of the 7-day period in this month (e.g. 3/7)
  weeklySalary: number;
  sss: number;
  pagibig: number;
  philhealth: number;
  vul: number;
  emergencyFund: number;
  generalSavings: number;
  netIncome: number;
  grossIncome: number;
  deductions: number;
}

/**
 * Split a weekly income entry proportionally across months.
 * The pay period is assumed to be the 7 days ending on the entry's date.
 * If all 7 days fall in one month, returns a single slice.
 * If the period crosses a month boundary, returns two slices with proportional amounts.
 */
export const splitIncomeByMonth = (entry: IncomeEntry): MonthlySlice[] => {
  const [y, m, d] = entry.date.split('-').map(Number);
  const endDate = new Date(y, m - 1, d);         // last day of pay period
  const startDate = new Date(y, m - 1, d - 6);   // first day of pay period (7 days)

  const endMonthKey = toMonthKey(endDate);
  const startMonthKey = toMonthKey(startDate);

  const applyRatio = (ratio: number): Omit<MonthlySlice, 'monthKey' | 'ratio'> => {
    const weeklySalary = entry.weeklySalary * ratio;
    const sss = (entry.sss || 0) * ratio;
    const pagibig = (entry.pagibig || 0) * ratio;
    const philhealth = (entry.philhealth || 0) * ratio;
    const vul = (entry.vul || 0) * ratio;
    const emergencyFund = (entry.emergencyFund || 0) * ratio;
    const generalSavings = (entry.generalSavings || 0) * ratio;
    const deductions = sss + pagibig + philhealth + vul + emergencyFund + generalSavings;
    return {
      weeklySalary,
      sss, pagibig, philhealth, vul, emergencyFund, generalSavings,
      grossIncome: weeklySalary,
      deductions,
      netIncome: Math.max(0, weeklySalary - deductions),
    };
  };

  // Same month — no split needed
  if (startMonthKey === endMonthKey) {
    return [{ monthKey: endMonthKey, ratio: 1, ...applyRatio(1) }];
  }

  // Crosses month boundary — count days in each month
  // Days in the start month: from startDate to end of that month
  const lastDayOfStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  const daysInStartMonth = lastDayOfStartMonth.getDate() - startDate.getDate() + 1;
  const daysInEndMonth = 7 - daysInStartMonth;

  const startRatio = daysInStartMonth / 7;
  const endRatio = daysInEndMonth / 7;

  return [
    { monthKey: startMonthKey, ratio: startRatio, ...applyRatio(startRatio) },
    { monthKey: endMonthKey, ratio: endRatio, ...applyRatio(endRatio) },
  ];
};

/**
 * Aggregate all income entries into monthly totals, splitting entries that cross month boundaries.
 * Returns a Map of monthKey -> aggregated values.
 */
export interface MonthlyIncomeTotals {
  grossIncome: number;
  netIncome: number;
  deductions: number;
  emergencyFund: number;
  generalSavings: number;
  entryCount: number; // number of (possibly partial) entries contributing
}

export const getMonthlyIncomeTotals = (incomeHistory: IncomeEntry[]): Map<string, MonthlyIncomeTotals> => {
  const map = new Map<string, MonthlyIncomeTotals>();

  const ensure = (key: string): MonthlyIncomeTotals => {
    if (!map.has(key)) {
      map.set(key, { grossIncome: 0, netIncome: 0, deductions: 0, emergencyFund: 0, generalSavings: 0, entryCount: 0 });
    }
    return map.get(key)!;
  };

  incomeHistory.forEach(entry => {
    const slices = splitIncomeByMonth(entry);
    slices.forEach(slice => {
      const totals = ensure(slice.monthKey);
      totals.grossIncome += slice.grossIncome;
      totals.netIncome += slice.netIncome;
      totals.deductions += slice.deductions;
      totals.emergencyFund += slice.emergencyFund;
      totals.generalSavings += slice.generalSavings;
      totals.entryCount += slice.ratio; // partial entries count fractionally
    });
  });

  return map;
};

/** Returns true if the string is a valid UUID (so Supabase will accept it). */
export const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);
