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
  glyph: string;
}> = {
  'overdue':    { label: 'Overdue',     badgeClasses: 'bg-coral-500 text-paper',     accent: 'text-coral-500',     glyph: '!' },
  'due-soon':   { label: 'Due This Week', badgeClasses: 'bg-gold-100 text-gold-700', accent: 'text-gold-600',     glyph: '◐' },
  'upcoming':   { label: 'Upcoming',    badgeClasses: 'bg-ink/8 text-ink',           accent: 'text-ink',           glyph: '○' },
  'paid-ahead': { label: 'Paid Ahead',  badgeClasses: 'bg-jade-50 text-jade-700',    accent: 'text-jade-500',      glyph: '✓' },
  'paid-off':   { label: 'Paid Off',    badgeClasses: 'bg-ink text-paper',           accent: 'text-jade-500',      glyph: '★' },
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
        className="px-6 py-5 hover:bg-paper-soft/40 transition-colors stagger animate-fade-up"
        style={{ animationDelay: `${idx * 30}ms` }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-display text-xl text-ink leading-tight">{bill.name}</h3>
              <span className="text-[9px] font-medium text-ink-muted uppercase tracking-[0.2em]">
                {bill.category}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-3 flex-wrap">
              <span className="num text-lg font-medium text-ink">{formatCurrency(bill.amount)}</span>
              <span className="text-ink-whisper">·</span>
              {status === 'paid-off' ? (
                <span className="text-xs text-jade-500 font-medium">Loan complete · {paidCount} payments filed</span>
              ) : (
                <span className={`text-xs font-medium ${meta.accent}`}>
                  {formatDueLabel(bill, today)}
                </span>
              )}
              {isFinite && status !== 'paid-off' && (
                <>
                  <span className="text-ink-whisper">·</span>
                  <span className="num text-xs text-ink-muted">{paidCount}/{bill.totalPayments} · {remaining} left</span>
                </>
              )}
            </div>

            {/* Loan progress bar */}
            {isFinite && status !== 'paid-off' && (
              <div className="mt-3 max-w-xs">
                <div className="h-1 w-full bg-ink/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-jade-500 to-gold-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[9px] font-medium px-2.5 py-1 rounded-full uppercase tracking-[0.18em] ${meta.badgeClasses}`}>
              {meta.label}
            </span>
            {status === 'paid-off' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-jade-500 px-3 py-1.5">
                <Award className="w-3.5 h-3.5" />
                Settled
              </span>
            ) : status === 'paid-ahead' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-jade-500 px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Settled
              </span>
            ) : (
              <button
                onClick={() => startPaying(bill.id)}
                className={`group inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full transition-all ${
                  status === 'overdue'
                    ? 'bg-coral-500 text-paper hover:bg-coral-600'
                    : 'bg-ink text-paper hover:bg-jade-500'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Settle
              </button>
            )}
            <button
              onClick={() => setHistoryBillId(showHistory ? null : bill.id)}
              className="p-1.5 text-ink-whisper hover:text-ink hover:bg-ink/5 rounded-full transition-all"
              title="Payment history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(bill)}
              className="p-1.5 text-ink-whisper hover:text-ink hover:bg-ink/5 rounded-full transition-all"
              title="Edit bill"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(bill.id)}
              className="p-1.5 text-ink-whisper hover:text-coral-500 hover:bg-coral-50 rounded-full transition-all"
              title="Delete bill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isPaying && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-paper-soft rounded-xl border border-rule animate-fade-up">
            <label className="eyebrow whitespace-nowrap">Date paid</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-paper border border-rule rounded-lg text-sm focus:border-ink outline-none num"
            />
            <button
              onClick={() => handleConfirmPay(bill)}
              className="px-4 py-1.5 bg-jade-500 hover:bg-jade-600 text-paper text-xs font-medium rounded-full transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleCancelPay}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showHistory && (
          <div className="mt-4 p-4 bg-paper-soft/50 rounded-xl border border-rule animate-fade-up">
            <div className="eyebrow mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Payment history
            </div>
            {billPayments.length === 0 ? (
              <p className="text-xs italic text-ink-whisper">No payments recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {billPayments.slice(0, 12).map(p => {
                  const lateDays = daysBetween(p.dueDate, p.paidDate);
                  const onTimeLabel = lateDays === 0 ? 'on time' : lateDays > 0 ? `${lateDays}d late` : `${Math.abs(lateDays)}d early`;
                  const onTimeClass = lateDays > 0 ? 'bg-coral-50 text-coral-500' : lateDays < 0 ? 'bg-gold-50 text-gold-700' : 'bg-jade-50 text-jade-700';
                  return (
                    <li key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">
                        Due <span className="font-mono text-ink">{formatDateString(p.dueDate)}</span> · paid <span className="font-mono text-ink">{formatDateString(p.paidDate)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="num text-ink-muted">{formatCurrency(p.amount)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${onTimeClass}`}>
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
    <div className="bg-paper rounded-2xl shadow-paper overflow-hidden flex flex-col">
      {/* Editorial header */}
      <div className="p-6 border-b border-rule">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="eyebrow mb-1">Section · Obligations</p>
            <h2 className="font-display text-3xl text-ink leading-tight">The Ledger of Bills</h2>
          </div>
          <div className="text-right">
            <p className="num text-lg text-ink font-medium">{formatCurrency(totalMonthly)}</p>
            <p className="eyebrow mt-0.5">{bills.length} {bills.length === 1 ? 'entry' : 'entries'} · monthly</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[11px] flex-wrap">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-coral-500 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {overdueCount} overdue — settle now
            </span>
          )}
          {dueSoonTotal > 0 && overdueCount === 0 && (
            <span className="text-gold-700 font-medium">
              <span className="num">{formatCurrency(dueSoonTotal)}</span> needs paying soon
            </span>
          )}
          {paidAheadTotal > 0 && (
            <span className="text-jade-600 font-medium">
              <span className="num">{formatCurrency(paidAheadTotal)}</span> paid ahead — well done
            </span>
          )}
          {bills.length > 0 && overdueCount === 0 && dueSoonTotal === 0 && (
            <span className="text-ink-muted italic">All quiet on the bill front.</span>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[640px]">
        {bills.length === 0 ? (
          <div className="p-16 text-center">
            <p className="font-display text-2xl text-ink-whisper italic mb-2">No bills yet.</p>
            <p className="text-sm text-ink-muted">Add your recurring obligations to begin tracking.</p>
          </div>
        ) : (
          groupOrder.map(status => {
            const list = grouped[status];
            if (list.length === 0) return null;
            const meta = STATUS_META[status];
            return (
              <div key={status}>
                <div className="px-6 py-2.5 bg-paper-soft/60 border-y border-rule flex items-center justify-between">
                  <span className={`eyebrow ${meta.accent}`}>{meta.label}</span>
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
