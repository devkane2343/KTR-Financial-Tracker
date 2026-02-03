
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
  Others = 'Others'
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
}

export interface Expense {
  id: string;
  date: string;
  category: Category;
  amount: number;
  description: string;
}

export interface FinancialData {
  incomeHistory: IncomeEntry[];
  expenses: Expense[];
}

export type TabType = 'dashboard' | 'expenses' | 'analytics' | 'income' | 'profile' | 'admin';
