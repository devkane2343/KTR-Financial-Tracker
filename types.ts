
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

export type TabType = 'dashboard' | 'expenses' | 'analytics' | 'income' | 'portfolio' | 'profile' | 'admin';
