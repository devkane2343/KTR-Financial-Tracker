
export enum Category {
  EmergencyFund = 'Emergency Fund',
  GeneralSavings = 'General Savings',
  LifeInsurance = 'Life Insurance',
  Food = 'Food',
  Transportation = 'Transportation',
  Utilities = 'Utilities',
  Entertainment = 'Entertainment',
  Bills = 'Bills',
  Shopping = 'Shopping',
  Health = 'Health',
  Savings = 'Savings',
  PagibigMP2 = 'Pag-IBIG MP2',
  Others = 'Others'
}

export type BillCategory = 'Insurance' | 'Utilities' | 'Rent' | 'Internet' | 'Loan' | 'Other';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: BillCategory;
  /** YYYY-MM-DD — the next upcoming due date. Advances by 1 month each time the bill is paid. */
  dueDate: string;
  /** If set, bill becomes "paid off" once this many payments are recorded. Undefined = recurring forever. */
  totalPayments?: number;
  active: boolean;
}

export interface BillPayment {
  id: string;
  billId: string;
  /** YYYY-MM-DD — the due date this payment settles. */
  dueDate: string;
  /** YYYY-MM-DD — when the user actually paid. */
  paidDate: string;
  /** Snapshot of the bill amount at time of payment. */
  amount: number;
}

export interface PaidBill {
  billId: string;
  name: string;
  amount: number;
}

export interface IncomeEntry {
  id: string;
  date: string;
  weeklySalary: number;
  sss: number;
  pagibig: number;
  philhealth: number;
  vul: number;
  emergencyFund?: number;
  generalSavings?: number;
  paidBills?: PaidBill[];
}

export interface Expense {
  id: string;
  date: string;
  category: Category;
  amount: number;
  description: string;
  /**
   * True for synthetic expense rows derived from a settled Bill payment.
   * These are read-only in the Expenses list (edit/delete happens on the Bills
   * tab) but count toward all expense totals, charts, and reports.
   */
  isBillPayment?: boolean;
}

/** Outcome of attempting to settle a bill, so the UI can give feedback. */
export type PayResult = 'paid' | 'already-paid' | 'paid-off';

export interface FinancialData {
  incomeHistory: IncomeEntry[];
  expenses: Expense[];
  bills: Bill[];
  billPayments: BillPayment[];
}

export interface Portfolio {
  id?: string;
  user_id?: string;
  company_name: string;
  position: string;
  rate_type: 'hourly' | 'monthly';
  hourly_rate: number;
  monthly_rate: number;
  hours_per_day: number;
  dreams: string;
  created_at?: string;
  updated_at?: string;
}

export type TabType = 'dashboard' | 'expenses' | 'analytics' | 'income' | 'bills' | 'networth' | 'portfolio' | 'profile' | 'admin';
