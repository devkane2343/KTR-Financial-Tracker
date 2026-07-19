
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

/**
 * Where the money for an expense was pulled from. Only liquid pots are valid
 * sources. `kind` picks the pot; `id` identifies the specific custom card when
 * kind === 'custom'; `label` is a display snapshot so the Expenses list can show
 * the source even if the underlying card is later renamed or deleted.
 *   - wallet / debit  → decrements the stored wallet_balance column directly.
 *   - custom          → decrements that custom_savings_accounts row's balance.
 *   - savings         → a computed bucket (EF / General / Other). Pulling from it
 *                       records a linked negative "withdrawal" expense in that
 *                       bucket's category, which lowers the computed total.
 *                       `id` holds the SavingsBucket key ('emergencyFund'…).
 */
export type ExpenseSourceKind = 'wallet' | 'debit' | 'custom' | 'savings';

export interface ExpenseSource {
  kind: ExpenseSourceKind;
  /** Custom-card UUID (kind='custom') or SavingsBucket key (kind='savings'). */
  id?: string;
  /** Display snapshot, e.g. "Debit Card", "Emergency Fund", "House fund". */
  label: string;
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
  /**
   * Which liquid pot this expense was paid from. When set, adding the expense
   * auto-deducts the amount from that pot and deleting it reverses the deduction.
   * Undefined for legacy / untagged expenses (no balance effect).
   */
  source?: ExpenseSource;
  /**
   * When set, this row is a synthetic negative "withdrawal" that pairs with a
   * real expense (whose id this holds) funded from a computed savings bucket.
   * It carries a negative amount in the bucket's category so the bucket total
   * drops. Hidden from the Expenses list; deleting the parent deletes this too.
   */
  savingsWithdrawalFor?: string;
  /**
   * When set, this row is a synthetic leg of a self-transfer between two pots
   * (see {@link PotTransfer}). It carries a signed amount in a computed savings
   * bucket's category — negative on the "from" leg, positive on the "to" leg —
   * so the bucket totals shift. All legs of one transfer share this id. Hidden
   * from the Expenses list; both legs are removed together.
   */
  transferId?: string;
}

/**
 * A record of moving money between the user's own pots (a "bank transfer to
 * self"). Persisted so transfers can be listed and undone. Stored-pot legs
 * (Wallet / Debit / custom) adjust those balances directly and leave no expense
 * row; computed-bucket legs (EF / General / Other / MP2) are realized as signed
 * `transferId` expense rows. `from`/`to` reuse ExpenseSource as a pot pointer.
 */
export interface PotTransfer {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  from: ExpenseSource;
  to: ExpenseSource;
  amount: number;
  note?: string;
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
