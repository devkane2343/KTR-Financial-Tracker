
import React, { useMemo, useState } from 'react';
import { Bill, BillPayment } from '../types';
import {
  formatCurrency,
  formatDateString,
  getLocalDateString,
  getBillStatus,
  daysBetween,
  getPaymentsMade,
  BillStatus,
} from '../lib/utils';
import {
  Trash2,
  Edit2,
  CheckCircle,
  CreditCard,
  X,
  AlertCircle,
  Clock,
  History,
  Award,
} from 'lucide-react';

interface BillListProps {
  bills: Bill[];
  payments: BillPayment[];
  onDelete: (id: string) => void;
  onEdit: (bill: Bill) => void;
  onPay: (bill: Bill, paidDate: string) => void;
}

const STATUS_META: Record<BillStatus, {
  label: string;
  badgeClasses: string;
  accent: string;
}> = {
  'overdue':    { label: 'Overdue',     badgeClasses: 'bg-coral-500 text-paper',         accent: 'text-coral-600' },
  'due-soon':   { label: 'Due soon',    badgeClasses: 'bg-gold-100 text-gold-700',       accent: 'text-gold-700' },
  'upcoming':   { label: 'Upcoming',    badgeClasses: 'bg-paper-soft text-ink-soft',     accent: 'text-ink-soft' },
  'paid-ahead': { label: 'Paid ahead',  badgeClasses: 'bg-jade-50 text-jade-700',        accent: 'text-jade-600' },
  'paid-off':   { label: 'Paid off',    badgeClasses: 'bg-ink text-paper',               accent: 'text-jade-600' },
};

const formatDueLabel = (bill: Bill, today: string): string => {
  const days = daysBetween(today, bill.dueDate);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 30) return `Due in ${days} days`;
  return `Due ${formatDateString(bill.dueDate)}`;
};

export const BillList: React.FC<BillListProps> = ({ bills, payments, onDelete, onEdit, onPay }) => {
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(getLocalDateString());
  const [historyBillId, setHistoryBillId] = useState<string | null>(null);
  const today = getLocalDateString();

  const enriched = useMemo(() => bills.map(bill => ({ bill, status: getBillStatus(bill, payments, today) })), [bills, payments, today]);

  const grouped = useMemo(() => {
    const groups: Record<BillStatus, Bill[]> = {
      'overdue': [], 'due-soon': [], 'upcoming': [], 'paid-ahead': [], 'paid-off': [],
    };
    enriched.forEach(({ bill, status }) => groups[status].push(bill));
    (Object.keys(groups) as BillStatus[]).forEach(key => {
      groups[key].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    });
    return groups;
  }, [enriched]);

  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);
  const overdueCount = grouped['overdue'].length;
  const paidAheadTotal = grouped['paid-ahead'].reduce((sum, b) => sum + b.amount, 0);
  const dueSoonTotal = grouped['due-soon'].reduce((sum, b) => sum + b.amount, 0) + grouped['overdue'].reduce((sum, b) => sum + b.amount, 0);

  const startPaying = (id: string) => { setPayingBillId(id); setPayDate(getLocalDateString()); };
  const handleConfirmPay = (bill: Bill) => { onPay(bill, payDate); setPayingBillId(null); };
  const handleCancelPay = () => setPayingBillId(null);

  const paymentsByBill = useMemo(() => {
    const map = new Map<string, BillPayment[]>();
    payments.forEach(p => {
      const list = map.get(p.billId) ?? [];
      list.push(p);
      map.set(p.billId, list);
    });
    map.forEach(list => list.sort((a, b) => b.dueDate.localeCompare(a.dueDate)));
    return map;
  }, [payments]);

  const renderRow = (bill: Bill, status: BillStatus, idx: number) => {
    const meta = STATUS_META[status];
    const isPaying = payingBillId === bill.id;
    const showHistory = historyBillId === bill.id;
    const billPayments = paymentsByBill.get(bill.id) ?? [];
    const paidCount = getPaymentsMade(bill.id, payments);
    const isFinite = bill.totalPayments !== undefined;
    const remaining = isFinite ? Math.max(0, bill.totalPayments! - paidCount) : null;
    const progress = isFinite ? (paidCount / bill.totalPayments!) : 0;

    return (
      <div
        key={bill.id}
        className="px-5 py-4 hover:bg-paper-soft/60 transition-colors stagger animate-fade-up"
        style={{ animationDelay: `${idx * 20}ms` }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-base font-medium text-ink leading-tight">{bill.name}</h3>
              <span className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">
                {bill.category}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap text-xs">
              <span className="num text-base font-semibold text-ink">{formatCurrency(bill.amount)}</span>
              <span className="text-ink-whisper">·</span>
              {status === 'paid-off' ? (
                <span className="text-jade-600 font-medium">Loan complete · {paidCount} payments</span>
              ) : (
                <span className={`font-medium ${meta.accent}`}>
                  {formatDueLabel(bill, today)}
                </span>
              )}
              {isFinite && status !== 'paid-off' && (
                <>
                  <span className="text-ink-whisper">·</span>
                  <span className="num text-ink-muted">{paidCount}/{bill.totalPayments} · {remaining} left</span>
                </>
              )}
            </div>

            {isFinite && status !== 'paid-off' && (
              <div className="mt-2.5 max-w-xs">
                <div className="h-1 w-full bg-paper-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-jade-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${meta.badgeClasses}`}>
              {meta.label}
            </span>
            {status === 'paid-off' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-jade-600 px-2 py-1.5">
                <Award className="w-3.5 h-3.5" />
                Settled
              </span>
            ) : status === 'paid-ahead' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-jade-600 px-2 py-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Settled
              </span>
            ) : (
              <button
                onClick={() => startPaying(bill.id)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  status === 'overdue'
                    ? 'bg-coral-500 text-paper hover:bg-coral-600'
                    : 'bg-ink text-paper hover:bg-ink-soft'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Settle
              </button>
            )}
            <button
              onClick={() => setHistoryBillId(showHistory ? null : bill.id)}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper-soft rounded-md transition-colors"
              title="Payment history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(bill)}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper-soft rounded-md transition-colors"
              title="Edit bill"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(bill.id)}
              className="p-1.5 text-ink-muted hover:text-coral-600 hover:bg-coral-50 rounded-md transition-colors"
              title="Delete bill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isPaying && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-paper-soft rounded-lg border border-rule animate-fade-up">
            <label className="text-xs text-ink-muted whitespace-nowrap">Date paid</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-paper border border-rule rounded-md text-sm focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none num"
            />
            <button
              onClick={() => handleConfirmPay(bill)}
              className="px-3 py-1.5 bg-jade-600 hover:bg-jade-700 text-paper text-xs font-medium rounded-md transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleCancelPay}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showHistory && (
          <div className="mt-3 p-3 bg-paper-soft/70 rounded-lg border border-rule animate-fade-up">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Payment history
            </div>
            {billPayments.length === 0 ? (
              <p className="text-xs italic text-ink-whisper">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {billPayments.slice(0, 12).map(p => {
                  const lateDays = daysBetween(p.dueDate, p.paidDate);
                  const onTimeLabel = lateDays === 0 ? 'on time' : lateDays > 0 ? `${lateDays}d late` : `${Math.abs(lateDays)}d early`;
                  const onTimeClass = lateDays > 0 ? 'bg-coral-50 text-coral-600' : lateDays < 0 ? 'bg-gold-50 text-gold-700' : 'bg-jade-50 text-jade-700';
                  return (
                    <li key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">
                        Due <span className="font-mono text-ink">{formatDateString(p.dueDate)}</span> · paid <span className="font-mono text-ink">{formatDateString(p.paidDate)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="num text-ink-muted">{formatCurrency(p.amount)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${onTimeClass}`}>
                          {onTimeLabel}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const groupOrder: BillStatus[] = ['overdue', 'due-soon', 'upcoming', 'paid-ahead', 'paid-off'];

  return (
    <div className="bg-paper rounded-xl border border-rule overflow-hidden flex flex-col">
      <div className="p-5 border-b border-rule">
        <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-xs text-ink-muted mb-1">Recurring obligations</p>
            <h2 className="font-display text-xl text-ink tracking-tight">Bills</h2>
          </div>
          <div className="text-right">
            <p className="num text-base text-ink font-semibold">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-ink-muted mt-0.5">{bills.length} {bills.length === 1 ? 'bill' : 'bills'} · monthly</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs flex-wrap">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-coral-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {overdueCount} overdue — settle now
            </span>
          )}
          {dueSoonTotal > 0 && overdueCount === 0 && (
            <span className="text-gold-700 font-medium">
              <span className="num">{formatCurrency(dueSoonTotal)}</span> due soon
            </span>
          )}
          {paidAheadTotal > 0 && (
            <span className="text-jade-700 font-medium">
              <span className="num">{formatCurrency(paidAheadTotal)}</span> paid ahead
            </span>
          )}
          {bills.length > 0 && overdueCount === 0 && dueSoonTotal === 0 && (
            <span className="text-ink-muted">All bills current.</span>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[640px]">
        {bills.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base text-ink mb-1">No bills yet</p>
            <p className="text-sm text-ink-muted">Add your recurring obligations to begin tracking.</p>
          </div>
        ) : (
          groupOrder.map(status => {
            const list = grouped[status];
            if (list.length === 0) return null;
            const meta = STATUS_META[status];
            return (
              <div key={status}>
                <div className="px-5 py-2 bg-paper-soft/70 border-y border-rule flex items-center justify-between">
                  <span className={`text-[10px] uppercase tracking-wider font-medium ${meta.accent}`}>{meta.label}</span>
                  <span className="num text-[10px] text-ink-muted">{list.length}</span>
                </div>
                <div className="divide-y divide-rule">
                  {list.map((bill, idx) => renderRow(bill, status, idx))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
