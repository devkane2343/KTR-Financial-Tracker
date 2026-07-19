import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FinancialData, ExpenseSource } from '../types';
import { formatCurrency, formatDateString, getLocalDateString, getSavingsBreakdown, getSavingsContributions, type SavingsBucket } from '../lib/utils';
import type { FundingSource } from './ExpenseForm';
import { loadWalletBalances, saveWalletBalance, type BalanceField } from '../lib/walletStore';
import {
  loadCustomSavingsAccounts,
  createCustomSavingsAccount,
  updateCustomSavingsAccount,
  deleteCustomSavingsAccount,
  uploadCardBackground,
  type CustomSavingsAccount,
  type Liquidity,
  type AccountType,
  type PaidMonths,
} from '../lib/customSavingsStore';
import { loadValueHistory, appendValueSnapshot, type ValueSnapshot } from '../lib/investmentHistoryStore';
import {
  projectMp2,
  rateForYear,
  MP2_TERM_YEARS,
  MP2_MIN_CONTRIBUTION,
  MP2_LATEST_RATE_PCT,
  MP2_HISTORICAL_RATES,
  type Mp2PayoutMode,
  type Mp2YearRow,
} from '../lib/mp2Projection';
import { useModal } from '../lib/useModal';
import { ModalPortal } from './ModalPortal';
import { Wallet, PiggyBank, Shield, Landmark, Coins, CreditCard, Check, Pencil, X, Banknote, Receipt, ChevronLeft, ChevronRight, Plus, Trash2, ImagePlus, Loader2, ArrowDownRight, ArrowRightLeft, ArrowRight, TrendingUp, TrendingDown, LineChart, Sparkles, Sprout, Lock, Info, RotateCcw } from 'lucide-react';

/**
 * Growth of an investment/VUL card: current fund value vs what was paid in.
 * `pct` is null when there's nothing contributed yet (avoids divide-by-zero).
 */
export interface Growth {
  gain: number;      // fundValue − contributed (can be negative)
  pct: number | null;
  up: boolean;       // gain >= 0
}
const computeGrowth = (fundValue: number, contributed: number): Growth => {
  const gain = fundValue - contributed;
  const pct = contributed > 0 ? (gain / contributed) * 100 : null;
  return { gain, pct, up: gain >= 0 };
};
/** Short month labels for the paid-months grid, index 0 = Jan. */
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "+₱18,400 (+15.3%)" / "−₱2,000 (−4.1%)". Sign always shown. */
const formatGrowth = (g: Growth): string => {
  const sign = g.gain >= 0 ? '+' : '−';
  const money = `${sign}${formatCurrency(Math.abs(g.gain))}`;
  if (g.pct === null) return money;
  const pctSign = g.pct >= 0 ? '+' : '−';
  return `${money} (${pctSign}${Math.abs(g.pct).toFixed(1)}%)`;
};

/**
 * Tiny inline SVG sparkline of a value series (no chart lib). Scales the series
 * to fit the box; draws a soft area fill under a 2px line. Flat/empty series
 * render a centered baseline. Color follows overall direction (up=jade, down=coral).
 */
const Sparkline: React.FC<{ values: number[]; className?: string; up?: boolean }> = ({ values, className, up = true }) => {
  const W = 240, H = 56, P = 4;
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : P + (i / (n - 1)) * (W - 2 * P));
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M ${pts.join(' L ')}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${H - P} L ${x(0).toFixed(1)},${H - P} Z`;
  const stroke = up ? '#16a34a' : '#e11d48';
  const fill = up ? 'rgba(22,163,74,0.12)' : 'rgba(225,29,72,0.12)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      {n > 1 && <path d={area} fill={fill} stroke="none" />}
      {n > 1
        ? <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        : <circle cx={x(0)} cy={y(values[0])} r={3} fill={stroke} />}
    </svg>
  );
};

interface NetWorthTabProps {
  data: FinancialData;
  /**
   * Whether this tab is the one currently on screen. The panel stays mounted
   * when hidden (see App's HIDDEN_PANEL), so we re-fetch wallet/debit/custom
   * balances each time it becomes active — an expense logged on another tab may
   * have deducted from one of these stored pots in the meantime.
   */
  active?: boolean;
  /** Every pot the user can move money between (from App's funding hook). */
  pots?: FundingSource[];
  /** Perform a self-transfer between two pots; resolves ok/error. */
  onTransfer?: (
    from: ExpenseSource,
    to: ExpenseSource,
    amount: number,
    date: string,
    note?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Full Pag-IBIG MP2 logo — house + cupped-hands + yellow "Pag-IBIG FUND" disc
 * alongside the "MP2 SAVINGS" wordmark, recreated as an inline SVG (the app
 * blocks remote images). Crisp (no blur); sits next to the value on the MP2 card.
 */
const MP2_INDIGO = '#312a7a';
const Mp2Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 744 366" className={className} aria-hidden="true">
    <rect width="744" height="366" rx="24" fill={MP2_INDIGO} />
    {/* House outline */}
    <path d="M60 150 L183 58 L306 150 L306 322 L60 322 Z" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinejoin="round" />
    {/* Cupped hands */}
    <path d="M96 208 q-16 46 22 82 q32 30 65 30 q33 0 65 -30 q38 -36 22 -82 q-30 22 -87 22 q-57 0 -87 -22 Z" fill="#5ec6e8" />
    {/* Yellow Pag-IBIG disc */}
    <circle cx="183" cy="168" r="60" fill="#ffe11a" />
    <circle cx="215" cy="132" r="16" fill="#5ec6e8" stroke="#ffffff" strokeWidth="4" />
    <text x="183" y="162" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="30" fill={MP2_INDIGO}>Pag-</text>
    <text x="183" y="192" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="30" fill={MP2_INDIGO}>IBIG</text>
    <text x="183" y="214" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="15" fill={MP2_INDIGO}>FUND</text>
    {/* Wordmark — textLength pins each line inside the viewBox so nothing clips */}
    <text x="404" y="168" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="120" fill="#ffe11a">MP2</text>
    <text x="404" y="268" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="86" fill="#ffffff" letterSpacing="1" textLength="320" lengthAdjust="spacingAndGlyphs">SAVINGS</text>
    <text x="404" y="308" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="17" fill="#ffffff" textLength="322" lengthAdjust="spacingAndGlyphs">THE MORE YOU SAVE, THE MORE YOU GET!</text>
  </svg>
);

/**
 * GoTyme Bank VISA card artwork — charcoal→cyan split with the vertical
 * barcode stripes, contactless glyph, VISA wordmark, and the "GO tyme" mark.
 * Recreated as an inline SVG (the app blocks remote images). Used full-bleed as
 * a low-opacity background behind the Emergency Fund and General Savings cards.
 */
const GOTYME_CYAN = '#2ec4c9';
const GOTYME_INK = '#2b2e34';
const GoTymeCard: React.FC<{ className?: string }> = ({ className }) => {
  // Vertical barcode stripes across the middle: dark stripes on the charcoal
  // side, dark stripes on the cyan side — varying widths, like the real card.
  const stripes: React.ReactNode[] = [];
  let x = 250;
  let i = 0;
  while (x < 780) {
    const w = 4 + (i % 4) * 4;            // 4,8,12,16 repeating widths
    const onCyan = x > 620;               // right portion sits on the cyan field
    stripes.push(
      <rect key={i} x={x} y={0} width={w} height={480} fill={onCyan ? GOTYME_INK : GOTYME_CYAN} opacity={onCyan ? 0.9 : 0.85} />
    );
    x += w + 12 + (i % 3) * 4;
    i++;
  }
  // Spokes inside the "O" of GO.
  const spokes = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * 2 * Math.PI - Math.PI / 2;
    const r1 = 14, r2 = 30, cx = 1055, cy = 300;
    return (
      <line key={k}
        x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
        x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)}
        stroke={GOTYME_CYAN} strokeWidth={4} />
    );
  });
  return (
    <svg viewBox="0 0 1280 480" preserveAspectRatio="xMidYMid meet" className={className} aria-hidden="true">
      {/* Base split: charcoal left, cyan right */}
      <rect width="1280" height="480" fill={GOTYME_CYAN} />
      <rect width="900" height="480" fill={GOTYME_INK} />
      {/* Barcode stripes */}
      {stripes}
      {/* Contactless glyph (top-left) */}
      <g fill="none" stroke="#cfd2d6" strokeWidth="10" strokeLinecap="round">
        <path d="M120 70 a40 40 0 0 1 0 70" />
        <path d="M150 55 a70 70 0 0 1 0 100" />
        <path d="M180 40 a100 100 0 0 1 0 130" />
      </g>
      {/* VISA wordmark (bottom-left) */}
      <text x="120" y="420" fontFamily="Arial, sans-serif" fontWeight="800" fontStyle="italic" fontSize="66" fill="#cfd2d6" letterSpacing="4">VISA</text>
      {/* GO tyme mark (right, on cyan) */}
      <path d="M1010 250 a58 58 0 1 0 0 100 L1010 300 L968 300" fill="none" stroke={GOTYME_INK} strokeWidth="26" />
      <circle cx="1055" cy="300" r="46" fill="none" stroke={GOTYME_INK} strokeWidth="26" />
      {spokes}
      <text x="1120" y="290" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="72" fill={GOTYME_INK}>tyme</text>
    </svg>
  );
};

/**
 * MariBank debit card artwork — orange field with the "M" roundel, Mastercard
 * dual-circle, the little smile, and the "MariBank" wordmark over a swoosh.
 * Recreated as an inline SVG (the app blocks remote images). Used full-bleed as
 * a low-opacity background behind the Debit Card.
 */
const MARI_ORANGE = '#f26a21';
const MARI_CREAM = '#fdf1e7';
const MariBankCard: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid meet" className={className} aria-hidden="true">
    <rect width="1280" height="800" rx="48" fill={MARI_ORANGE} />
    {/* "M" roundel (top-left) */}
    <circle cx="150" cy="120" r="60" fill="none" stroke={MARI_CREAM} strokeWidth="10" />
    <path d="M120 148 L120 96 L150 132 L180 96 L180 148" fill="none" stroke={MARI_CREAM} strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M110 158 q40 22 80 0" fill="none" stroke={MARI_CREAM} strokeWidth="7" strokeLinecap="round" />
    {/* Mastercard dual circles (top-right) */}
    <circle cx="1090" cy="120" r="52" fill="#e0322f" />
    <circle cx="1160" cy="120" r="52" fill="#f6a417" opacity="0.9" />
    {/* Smile (upper-middle) */}
    <path d="M690 250 q60 60 130 10" fill="none" stroke={MARI_CREAM} strokeWidth="12" strokeLinecap="round" />
    <circle cx="700" cy="230" r="8" fill={MARI_CREAM} />
    {/* MariBank wordmark */}
    <text x="70" y="540" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="200" fill={MARI_CREAM} letterSpacing="-4">MariBank</text>
    {/* Underline swoosh */}
    <path d="M90 610 q400 -70 900 10" fill="none" stroke={MARI_CREAM} strokeWidth="12" strokeLinecap="round" opacity="0.8" />
    <path d="M150 640 q380 -50 760 20" fill="none" stroke={MARI_CREAM} strokeWidth="7" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/**
 * Small inline flag SVGs (the app blocks remote images). Rounded corners + a
 * hairline border so they read as little chips next to the wallet figure.
 */
const UsFlag: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 76 40" className={className} aria-label="United States" role="img">
    <clipPath id="us-round"><rect width="76" height="40" rx="4" /></clipPath>
    <g clipPath="url(#us-round)">
      <rect width="76" height="40" fill="#b22234" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} y={40 / 13 * (2 * i + 1)} width="76" height={40 / 13} fill="#fff" />
      ))}
      <rect width="32" height={40 / 13 * 7} fill="#3c3b6e" />
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: r % 2 === 0 ? 6 : 5 }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={3 + c * 5.4 + (r % 2 === 0 ? 0 : 2.7)}
            cy={2.4 + r * 2.2}
            r="0.9"
            fill="#fff"
          />
        )),
      )}
    </g>
    <rect x="0.5" y="0.5" width="75" height="39" rx="3.5" fill="none" stroke="#000" strokeOpacity="0.12" />
  </svg>
);

const AuFlag: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 76 40" className={className} aria-label="Australia" role="img">
    <clipPath id="au-round"><rect width="76" height="40" rx="4" /></clipPath>
    <g clipPath="url(#au-round)">
      <rect width="76" height="40" fill="#00247d" />
      {/* Union Jack canton */}
      <g>
        <rect width="38" height="20" fill="#00247d" />
        <path d="M0 0 L38 20 M38 0 L0 20" stroke="#fff" strokeWidth="4" />
        <path d="M0 0 L38 20 M38 0 L0 20" stroke="#cf142b" strokeWidth="2" />
        <path d="M19 0 V20 M0 10 H38" stroke="#fff" strokeWidth="6" />
        <path d="M19 0 V20 M0 10 H38" stroke="#cf142b" strokeWidth="3.5" />
      </g>
      {/* Commonwealth Star */}
      <path d="M19 24 l1.4 4.3 4.5 0 -3.6 2.6 1.4 4.3 -3.7 -2.7 -3.7 2.7 1.4 -4.3 -3.6 -2.6 4.5 0 z" fill="#fff" />
      {/* Southern Cross (simplified) */}
      <circle cx="58" cy="9" r="1.6" fill="#fff" />
      <circle cx="66" cy="16" r="1.6" fill="#fff" />
      <circle cx="55" cy="24" r="1.6" fill="#fff" />
      <circle cx="63" cy="31" r="1.6" fill="#fff" />
      <circle cx="60" cy="20" r="1" fill="#fff" />
    </g>
    <rect x="0.5" y="0.5" width="75" height="39" rx="3.5" fill="none" stroke="#000" strokeOpacity="0.12" />
  </svg>
);

/**
 * Editable money card (Wallet cash or Debit Card). Owns its own edit state and
 * persists via saveWalletBalance(field, …). Optionally renders low-opacity
 * brand artwork as a full-bleed background.
 */
interface BalanceCardProps {
  field: BalanceField;
  title: string;
  hint: string;
  icon: React.ReactNode;
  value: number;
  loaded: boolean;
  background?: React.ReactNode;   // low-opacity artwork layer, positioned absolute
  extra?: React.ReactNode;        // extra content under the value (e.g. flags / $ figure)
  badge?: React.ReactNode;        // small pill beside the title (e.g. liquidity)
  onSaved: (field: BalanceField, value: number) => void;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ field, title, hint, icon, value, loaded, background, extra, badge, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const startEdit = () => { setDraft(value ? String(value) : ''); setEditing(true); setStatus('idle'); };
  const cancelEdit = () => { setEditing(false); setStatus('idle'); };

  const save = async () => {
    const v = parseFloat(draft);
    if (!Number.isFinite(v) || v < 0) { setStatus('error'); setError('Enter a valid amount (0 or more).'); return; }
    setStatus('saving'); setError('');
    const res = await saveWalletBalance(field, v);
    if (res.ok) { onSaved(field, v); setEditing(false); setStatus('saved'); setTimeout(() => setStatus('idle'), 2500); }
    else { setStatus('error'); setError(res.error); }
  };

  return (
    <div className="group relative bg-paper rounded-xl border border-rule p-5 sm:p-6 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-paper-lift hover:border-ink/20">
      {background}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-md bg-paper-soft text-ink-soft flex items-center justify-center shrink-0">
                {icon}
              </span>
              <p className="text-sm font-medium text-ink">{title}</p>
              {badge}
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">{hint}</p>
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink border border-rule hover:bg-paper-soft px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>

        {!editing ? (
          <>
            <p className="num text-3xl font-semibold text-ink tracking-tight mt-4">
              {loaded ? formatCurrency(value) : '—'}
            </p>
            {extra}
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="bg-paper-soft/60 rounded-lg p-3.5 border border-rule">
              <p className="text-xs font-medium text-ink-soft mb-1.5">Amount</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-ink-muted font-mono text-xl">₱</span>
                <input
                  type="number" step="0.01" min="0" autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancelEdit(); }}
                  className="flex-1 bg-transparent border-0 outline-none num text-2xl text-ink font-semibold placeholder:text-ink-whisper py-0.5"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={status === 'saving'}
                className="inline-flex items-center gap-1.5 bg-ink hover:bg-ink-soft text-paper px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {status === 'saving'
                  ? <span className="w-3.5 h-3.5 border-[1.5px] border-paper/30 border-t-paper rounded-full animate-spin" />
                  : <Check className="w-4 h-4" />}
                <span>Save</span>
              </button>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink border border-rule hover:bg-paper-soft px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        {status === 'saved' && (
          <p className="mt-2 text-xs text-jade-600 inline-flex items-center gap-1"><Check className="w-3 h-3" /> {title} updated.</p>
        )}
        {status === 'error' && error && (
          <p className="mt-2 text-xs text-coral-600">{error}</p>
        )}
      </div>
    </div>
  );
};

/**
 * A tiny stacked growth-bar chart for the MP2 projection — one bar per year,
 * split into "your money" (contributions carried in) and "dividends earned",
 * so you can see the tax-free dividend slice grow as it compounds. Pure inline
 * SVG (the file already avoids chart libs for these small visuals).
 */
const Mp2GrowthBars: React.FC<{ rows: Mp2YearRow[]; className?: string }> = ({ rows, className }) => {
  if (rows.length === 0) return null;
  const W = 320, H = 120, PAD_B = 16, PAD_T = 8, GAP = 10;
  const max = Math.max(...rows.map(r => r.closing), 1);
  const n = rows.length;
  const bw = (W - GAP * (n - 1)) / n;
  const scaleY = (v: number) => (v / max) * (H - PAD_B - PAD_T);
  // Use the same non-negative opening the projection clamps to (projectMp2 floors
  // a negative/NaN balance at 0). Reading it straight from the first row keeps the
  // bar's "your money" split in lock-step with the row closings it's drawn against.
  const opening0 = rows[0].opening;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      {rows.map((r, i) => {
        // "Principal" portion of the closing balance = own money in the account at
        // year end (opening + contributions to date); the rest is accumulated dividend.
        const principal = opening0 + r.contributions * r.index;
        const principalH = scaleY(Math.min(principal, r.closing));
        const dividendH = scaleY(Math.max(r.closing - principal, 0));
        const x = i * (bw + GAP);
        const baseY = H - PAD_B;
        return (
          <g key={r.year}>
            <rect x={x} y={baseY - principalH} width={bw} height={principalH} rx={2} fill="currentColor" className="text-ink/25 dark:text-white/25" />
            <rect x={x} y={baseY - principalH - dividendH} width={bw} height={dividendH} rx={2} fill={MP2_INDIGO} />
            <text x={x + bw / 2} y={H - 4} textAnchor="middle" className="fill-ink-muted" fontSize="8">{`'${String(r.year).slice(2)}`}</text>
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Projection tab for the Pag-IBIG MP2 card. Projects the 5-year maturity value
 * from the current MP2 balance (opening) plus an editable monthly contribution,
 * compounding tax-free dividends annually on the average-monthly-balance basis
 * (see lib/mp2Projection). Every year's assumed dividend rate is individually
 * editable and prefilled at the latest declared rate (2025 = 7.12%). A toggle
 * switches between MP2's two payout modes: compounded (reinvested, lump sum at
 * maturity) vs annual payout (dividends paid out yearly, principal flat).
 */
interface Mp2ProjectionPanelProps {
  /** Current MP2 savings (tagged contributions) — the projection's opening balance. */
  openingBalance: number;
}

const Mp2ProjectionPanel: React.FC<Mp2ProjectionPanelProps> = ({ openingBalance }) => {
  // Projection starts this calendar year. Years run startYear … startYear+4.
  const startYear = useMemo(() => new Date().getFullYear(), []);
  const [monthly, setMonthly] = useState<string>(String(MP2_MIN_CONTRIBUTION));
  const [mode, setMode] = useState<Mp2PayoutMode>('compounded');
  // Per-year assumed rate (%). Prefilled to the latest declared rate for all 5
  // years; each year individually editable. Kept as strings so a half-typed
  // value (e.g. "7.") doesn't snap to a number mid-edit.
  const [rates, setRates] = useState<string[]>(() =>
    Array.from({ length: MP2_TERM_YEARS }, () => String(MP2_LATEST_RATE_PCT)),
  );

  const monthlyNum = parseFloat(monthly);
  const ratesNum = rates.map(r => parseFloat(r));

  const projection = useMemo(
    () => projectMp2({
      openingBalance,
      monthlyContribution: Number.isFinite(monthlyNum) ? monthlyNum : 0,
      startYear,
      ratesPct: ratesNum.map(r => (Number.isFinite(r) ? r : 0)),
      mode,
    }),
    // ratesNum/ratesNum are fresh arrays each render; depend on the string form.
    [openingBalance, monthlyNum, startYear, rates, mode],
  );

  const setRate = (i: number, v: string) =>
    setRates(prev => prev.map((r, idx) => (idx === i ? v : r)));

  // "Set all years to this rate" from the first year's value — a quick way to
  // apply one assumption across the whole term after editing year 1.
  const applyFirstToAll = () =>
    setRates(prev => prev.map(() => prev[0]));

  const resetRates = () =>
    setRates(Array.from({ length: MP2_TERM_YEARS }, () => String(MP2_LATEST_RATE_PCT)));

  const monthlyInvalid = !Number.isFinite(monthlyNum) || monthlyNum < 0;
  const belowMin = Number.isFinite(monthlyNum) && monthlyNum > 0 && monthlyNum < MP2_MIN_CONTRIBUTION;

  const maturityYear = startYear + MP2_TERM_YEARS - 1;
  const growthPct = projection.totalContributed > 0
    ? (projection.totalDividends / projection.totalContributed) * 100
    : 0;

  const inputBox = 'bg-paper-soft/60 rounded-lg border border-rule outline-none text-ink focus:border-ink/30 transition-colors';

  return (
    <div className="p-4 sm:p-5 space-y-5">
      {/* Headline result — the projected maturity value + tax-free dividend slice. */}
      <div className="relative overflow-hidden rounded-xl p-4 sm:p-5 text-white" style={{ backgroundColor: MP2_INDIGO }}>
        <div className="pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        {/* MP2 logo, top-right — on a soft white plate so its own indigo panel
            doesn't disappear into the indigo card. A little inspiration. */}
        <div className="pointer-events-none absolute top-3 right-3 sm:top-4 sm:right-4 rounded-lg bg-white/90 p-1 shadow-sm ring-1 ring-white/40">
          <Mp2Logo className="h-8 sm:h-9 w-auto rounded-md" />
        </div>
        <div className="relative">
          <p className="text-[11px] uppercase tracking-wider text-white/60 flex items-center gap-1.5 pr-20">
            <Sparkles className="w-3.5 h-3.5" />
            Projected {mode === 'compounded' ? 'maturity value' : 'principal at maturity'} · {maturityYear}
          </p>
          <p className="num text-3xl sm:text-4xl font-semibold tracking-tight mt-1">{formatCurrency(projection.maturityValue)}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/30" />
              <span className="text-white/70">You put in</span>
              <span className="font-semibold text-white">{formatCurrency(projection.totalContributed)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gold-400" />
              <span className="text-white/70">{mode === 'compounded' ? 'Dividends earned' : 'Dividends paid out'}</span>
              <span className="font-semibold text-gold-300">+{formatCurrency(projection.totalDividends)}</span>
              {growthPct > 0 && <span className="text-white/50">(+{growthPct.toFixed(1)}%)</span>}
            </span>
          </div>
          <p className="text-[10px] text-white/45 mt-2 inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> Tax-free · locked in for {MP2_TERM_YEARS} years
          </p>
        </div>
      </div>

      {/* Growth chart — stacked own-money vs dividends per year. */}
      <div className="rounded-xl border border-rule bg-paper-soft/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Balance by year</p>
          <div className="flex items-center gap-3 text-[10px] text-ink-muted">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-ink/25 dark:bg-white/25" /> Your money</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: MP2_INDIGO }} /> Dividends</span>
          </div>
        </div>
        <Mp2GrowthBars rows={projection.rows} className="w-full h-28" />
      </div>

      {/* Inputs — opening balance (read-only), monthly contribution, payout mode. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="text-xs font-medium text-ink-soft">Starting balance</span>
          <div className={`mt-1 flex items-baseline gap-1.5 px-3 py-2.5 ${inputBox} opacity-80`}>
            <span className="text-ink-muted font-mono text-lg">₱</span>
            <span className="num text-xl text-ink font-semibold">{formatCurrency(openingBalance).replace('₱', '')}</span>
          </div>
          <p className="text-[10px] text-ink-muted mt-1">Your MP2 savings so far (opening balance).</p>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-ink-soft">Monthly contribution</span>
          <div className={`mt-1 flex items-baseline gap-1.5 px-3 py-2.5 ${inputBox} ${monthlyInvalid ? 'border-coral-400' : ''}`}>
            <span className="text-ink-muted font-mono text-lg">₱</span>
            <input
              type="number" step="100" min="0" inputMode="decimal"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="500"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none num text-xl text-ink font-semibold placeholder:text-ink-whisper"
            />
          </div>
          <p className={`text-[10px] mt-1 ${belowMin ? 'text-gold-600 dark:text-gold-400' : 'text-ink-muted'}`}>
            {belowMin ? `MP2 minimum is ₱${MP2_MIN_CONTRIBUTION} per remittance.` : `Added every month for ${MP2_TERM_YEARS} years. Min ₱${MP2_MIN_CONTRIBUTION}.`}
          </p>
        </label>
      </div>

      {/* Payout mode toggle — compounded vs annual dividend payout. */}
      <div>
        <span className="text-xs font-medium text-ink-soft">Dividend option</span>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {([
            { key: 'compounded' as const, label: 'Compounded', hint: 'Reinvested · lump sum at maturity', icon: <Sprout className="w-3.5 h-3.5" /> },
            { key: 'annual' as const, label: 'Annual payout', hint: 'Paid out each year', icon: <Banknote className="w-3.5 h-3.5" /> },
          ]).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              aria-pressed={mode === opt.key}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                mode === opt.key ? 'bg-ink text-paper border-ink' : 'bg-paper-soft/60 text-ink-soft border-rule hover:border-ink/30'
              }`}
            >
              <span className="flex items-center gap-1.5">{opt.icon}{opt.label}</span>
              <span className={`block text-[10px] font-normal mt-0.5 ${mode === opt.key ? 'text-paper/70' : 'text-ink-muted'}`}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Per-year editable dividend rates. */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-ink-soft">Assumed dividend rate per year</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={applyFirstToAll} className="text-[11px] font-medium text-ink-soft hover:text-ink transition-colors">
              Apply {startYear} to all
            </button>
            <button type="button" onClick={resetRates} className="text-[11px] font-medium text-ink-soft hover:text-ink transition-colors inline-flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {rates.map((r, i) => (
            <label key={i} className="block">
              <span className="text-[10px] text-ink-muted font-mono">{startYear + i}</span>
              <div className={`mt-0.5 flex items-baseline gap-1 px-2.5 py-2 ${inputBox}`}>
                <input
                  type="number" step="0.01" min="0" max="100" inputMode="decimal"
                  value={r}
                  onChange={(e) => setRate(i, e.target.value)}
                  className="w-full min-w-0 bg-transparent border-0 outline-none num text-sm text-ink font-semibold placeholder:text-ink-whisper"
                />
                <span className="text-ink-muted text-xs">%</span>
              </div>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-ink-muted mt-2 inline-flex items-start gap-1 leading-relaxed">
          <Info className="w-3 h-3 mt-px shrink-0" />
          Prefilled at {MP2_LATEST_RATE_PCT}% — the latest declared rate (2025). The actual rate is set by Pag-IBIG each year and isn't guaranteed; this is a projection.
        </p>
      </div>

      {/* Historical reference rates — read-only chips to pick realistic numbers. */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Past declared rates (reference)</p>
        <div className="flex flex-wrap gap-1.5">
          {MP2_HISTORICAL_RATES.map(h => (
            <span key={h.year} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-paper-soft/60 border border-rule text-[10px] text-ink-soft tabular-nums">
              <span className="text-ink-muted">{h.year}</span>
              <span className="font-semibold text-ink">{h.ratePct.toFixed(2)}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Year-by-year breakdown table. */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-1.5">Year-by-year breakdown</p>
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full text-[11px] min-w-[440px]">
            <thead>
              <tr className="bg-paper-soft/60 text-ink-muted text-left">
                <th className="font-medium px-2.5 py-2">Year</th>
                <th className="font-medium px-2.5 py-2 text-right">Opening</th>
                <th className="font-medium px-2.5 py-2 text-right">+ Contrib</th>
                <th className="font-medium px-2.5 py-2 text-right">Rate</th>
                <th className="font-medium px-2.5 py-2 text-right">Dividend</th>
                <th className="font-medium px-2.5 py-2 text-right">{mode === 'compounded' ? 'Closing' : 'Balance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {projection.rows.map(row => (
                <tr key={row.year} className="text-ink">
                  <td className="px-2.5 py-2 font-mono text-ink-soft">{row.year}</td>
                  <td className="px-2.5 py-2 text-right num tabular-nums">{formatCurrency(row.opening)}</td>
                  <td className="px-2.5 py-2 text-right num tabular-nums text-ink-muted">{formatCurrency(row.contributions)}</td>
                  <td className="px-2.5 py-2 text-right num tabular-nums text-ink-soft">{row.ratePct.toFixed(2)}%</td>
                  <td className="px-2.5 py-2 text-right num tabular-nums font-semibold text-jade-600 dark:text-jade-400">+{formatCurrency(row.dividend)}</td>
                  <td className="px-2.5 py-2 text-right num tabular-nums font-semibold">{formatCurrency(row.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mode === 'annual' && (
          <p className="text-[10px] text-ink-muted mt-1.5">Under annual payout, each year's dividend is paid to you in cash, so the balance grows only from your contributions.</p>
        )}
      </div>
    </div>
  );
};

/**
 * Detail modal for a savings bucket — lists every contribution (how much + when),
 * newest first, with a running total. Opened by clicking a savings card. For the
 * Pag-IBIG MP2 bucket it also carries a "Projection" tab (see Mp2ProjectionPanel)
 * that forecasts the 5-year maturity value from the current balance.
 */
interface SavingsDetailModalProps {
  bucket: SavingsBucket;
  title: string;
  data: FinancialData;
  onClose: () => void;
  /** Enables the MP2 Projection tab. When set, its value seeds the opening balance. */
  mp2Balance?: number;
}

const PAGE_SIZE = 8;

const SavingsDetailModal: React.FC<SavingsDetailModalProps> = ({ bucket, title, data, onClose, mp2Balance }) => {
  const contributions = useMemo(
    () => getSavingsContributions(bucket, data.incomeHistory, data.expenses),
    [bucket, data.incomeHistory, data.expenses],
  );
  const total = contributions.reduce((s, c) => s + c.amount, 0);

  // The Projection tab is available only for MP2 (when a balance is provided).
  const hasProjection = mp2Balance !== undefined;
  const [tab, setTab] = useState<'contributions' | 'projection'>('contributions');
  const onProjection = hasProjection && tab === 'projection';

  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(contributions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageItems = contributions.slice(pageStart, pageStart + PAGE_SIZE);

  // Escape close, focus trap, scroll lock, focus restore — see useModal.
  const panelRef = useModal<HTMLDivElement>(onClose);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} contributions`}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bg-paper w-full sm:rounded-2xl rounded-t-2xl border border-rule shadow-paper-lift max-h-[85vh] flex flex-col animate-fade-up focus:outline-none transition-[max-width] ${onProjection ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div>
            <p className="eyebrow mb-1">{hasProjection ? 'Pag-IBIG MP2 savings' : 'Savings contributions'}</p>
            <h3 className="font-display text-lg text-ink tracking-tight">{title}</h3>
            <p className="num text-3xl font-semibold text-ink tracking-tight mt-1.5">{formatCurrency(total)}</p>
            <p className="text-[11px] text-ink-muted mt-1">
              Total set aside across {contributions.length} {contributions.length === 1 ? 'contribution' : 'contributions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar — only when the Projection tab exists (MP2). */}
        {hasProjection && (
          <div className="flex items-center gap-1 px-3 pt-3 border-b border-rule" role="tablist" aria-label="MP2 views">
            {([
              { key: 'contributions' as const, label: 'Contributions', icon: <Receipt className="w-3.5 h-3.5" /> },
              { key: 'projection' as const, label: 'Projection', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            ]).map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-t-lg border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'border-ink text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink-soft'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        )}

        {/* Projection tab (MP2 only) */}
        {onProjection ? (
          <div className="overflow-y-auto flex-1" role="tabpanel">
            <Mp2ProjectionPanel openingBalance={mp2Balance!} />
          </div>
        ) : (
        <>
        {/* List */}
        <div className="overflow-y-auto p-3 flex-1" role={hasProjection ? 'tabpanel' : undefined}>
          {contributions.length === 0 ? (
            <div className="flex flex-col items-center text-center py-12 px-6">
              <span className="w-11 h-11 rounded-xl bg-paper-soft text-ink-muted flex items-center justify-center mb-3">
                <PiggyBank className="w-5 h-5" />
              </span>
              <p className="text-sm font-medium text-ink">Nothing set aside yet</p>
              <p className="text-[11px] text-ink-muted mt-1 max-w-[220px] leading-relaxed">
                Contributions from your paychecks or expenses tagged to this pot will show up here.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {pageItems.map((c, i) => {
                const isWithdrawal = c.source === 'withdrawal';
                return (
                <li key={pageStart + i} className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-paper-soft transition-colors">
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    c.source === 'paycheck'
                      ? 'bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-400'
                      : isWithdrawal
                        ? 'bg-coral-50 text-coral-600 dark:bg-coral-900/40 dark:text-coral-400'
                        : 'bg-paper-soft text-ink-soft'
                  }`}>
                    {c.source === 'paycheck'
                      ? <Banknote className="w-4 h-4" />
                      : isWithdrawal
                        ? <ArrowDownRight className="w-4 h-4" />
                        : <Receipt className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink leading-tight">{formatDateString(c.date)}</p>
                    <p className="text-[11px] text-ink-muted truncate">
                      {c.source === 'paycheck'
                        ? 'From paycheck'
                        : isWithdrawal
                          ? (c.description || 'Withdrawn')
                          : (c.description || 'Logged as expense')}
                    </p>
                  </div>
                  <span className={`num text-sm font-semibold shrink-0 tabular-nums ${isWithdrawal ? 'text-coral-600 dark:text-coral-400' : 'text-jade-600 dark:text-jade-400'}`}>
                    {isWithdrawal ? `−${formatCurrency(Math.abs(c.amount))}` : `+${formatCurrency(c.amount)}`}
                  </span>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pager — only when there's more than one page */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-rule">
            <span className="text-[11px] text-ink-muted font-mono">
              {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, contributions.length)} of {contributions.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage <= 0}
                className="p-2.5 rounded-md border border-rule hover:bg-paper-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-ink" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="p-2.5 rounded-md border border-rule hover:bg-paper-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4 text-ink" />
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

/**
 * Growth-detail modal for an investment / VUL card. Shows the current fund value
 * and growth-vs-contributed headline, a sparkline of the fund value over time,
 * and a dated log of every snapshot (value, change since the previous point, and
 * growth-vs-contributed at that date). History is loaded from
 * investment_value_history; the current card values are always shown as the
 * newest point even if no snapshot row exists yet. Mirrors SavingsDetailModal's
 * overlay shell (backdrop + Escape close).
 */
interface InvestmentDetailModalProps {
  account: CustomSavingsAccount;
  onClose: () => void;
  onEdit: () => void;
}

const INV_PAGE_SIZE = 8;

const InvestmentDetailModal: React.FC<InvestmentDetailModalProps> = ({ account, onClose, onEdit }) => {
  const [history, setHistory] = useState<ValueSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadValueHistory(account.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setHistory(res.value);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [account.id]);

  // Escape close, focus trap, scroll lock, focus restore — see useModal.
  const panelRef = useModal<HTMLDivElement>(onClose);

  const growth = computeGrowth(account.balance, account.contributedValue);

  // History oldest→newest for the sparkline, collapsed to ONE point per date
  // (keeping the latest value for that day) so same-day edits never render as a
  // fake growth line. If the newest point doesn't match the card's current value
  // (e.g. changed via transfer without reopening), replace/append today's point
  // so the chart ends at "today". Compared in cents to dodge float drift vs the
  // numeric(12,2) DB storage.
  const points = useMemo(() => {
    const cents = (n: number) => Math.round(n * 100);
    // Collapse to last-per-date, preserving date order.
    const byDate = new Map<string, { date: string; fundValue: number; contributed: number }>();
    for (const h of history) byDate.set(h.asOf, { date: h.asOf, fundValue: h.fundValue, contributed: h.contributedValue });
    const pts = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const today = getLocalDateString();
    const last = pts[pts.length - 1];
    const matchesNow = last && cents(last.fundValue) === cents(account.balance) && cents(last.contributed) === cents(account.contributedValue);
    if (!matchesNow) {
      if (last && last.date === today) {
        // Today already has a point — update it in place rather than duplicating.
        pts[pts.length - 1] = { date: today, fundValue: account.balance, contributed: account.contributedValue };
      } else {
        pts.push({ date: today, fundValue: account.balance, contributed: account.contributedValue });
      }
    }
    return pts;
  }, [history, account.balance, account.contributedValue]);

  // Whether the series spans more than one calendar day — a single day isn't
  // growth-over-time, so the chart is only meaningful with ≥2 distinct dates.
  const multiDay = useMemo(() => new Set(points.map(p => p.date)).size > 1, [points]);

  // Newest-first log with change-since-previous.
  const log = useMemo(() => {
    return points
      .map((p, i) => ({ ...p, delta: i > 0 ? p.fundValue - points[i - 1].fundValue : null }))
      .reverse();
  }, [points]);

  const pageCount = Math.max(1, Math.ceil(log.length / INV_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = log.slice(safePage * INV_PAGE_SIZE, safePage * INV_PAGE_SIZE + INV_PAGE_SIZE);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label={`${account.name} growth`}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-paper w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl border border-rule shadow-paper-lift max-h-[88vh] flex flex-col animate-fade-up focus:outline-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — spans the full width above the two columns */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted mb-0.5 truncate">
              {account.provider ? `${account.provider} · ` : ''}Investment · fund value
            </p>
            <h3 className="font-display text-lg text-ink tracking-tight truncate">{account.name}</h3>
            <div className="flex items-baseline gap-3 mt-1 flex-wrap">
              <p className="num text-2xl font-semibold text-ink">{formatCurrency(account.balance)}</p>
              <p className={`text-[11px] inline-flex items-center gap-1 font-medium ${growth.up ? 'text-jade-600 dark:text-jade-400' : 'text-coral-600'}`}>
                {growth.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {formatGrowth(growth)} vs {formatCurrency(account.contributedValue)} in
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-2.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors" aria-label="Edit card" title="Edit / update fund value">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — horizontal on sm+: chart on the left, history log on the right.
            On mobile it stacks and the WHOLE body scrolls; on sm+ only the log
            column scrolls (overflow-hidden here + overflow-auto on the log). */}
        <div className="flex flex-col sm:flex-row min-h-0 flex-1 overflow-y-auto sm:overflow-hidden">
          {/* LEFT: growth chart + a compact stat strip */}
          <div className="sm:w-[46%] sm:shrink-0 p-5 sm:border-r border-rule flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium mb-2">Fund value over time</p>
              {multiDay ? (
                <div className="rounded-lg border border-rule bg-paper-soft/40 p-3">
                  <Sparkline values={points.map(p => p.fundValue)} up={growth.up} className="w-full h-24 sm:h-28" />
                  <div className="flex items-center justify-between mt-2 text-[10px] text-ink-muted font-mono">
                    <span>{formatDateString(points[0].date)}</span>
                    <span>{formatDateString(points[points.length - 1].date)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-rule bg-paper-soft/30 p-6 text-center">
                  <LineChart className="w-6 h-6 mx-auto text-ink-whisper mb-2" />
                  <p className="text-[11px] text-ink-muted">Update the fund value on different days to build a growth chart.</p>
                </div>
              )}
            </div>
            {/* Stat strip: contributed vs fund value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-rule bg-paper-soft/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">Contributed</p>
                <p className="num text-base font-semibold text-ink mt-0.5">{formatCurrency(account.contributedValue)}</p>
              </div>
              <div className="rounded-lg border border-rule bg-paper-soft/40 p-3">
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">Growth</p>
                <p className={`num text-base font-semibold mt-0.5 ${growth.up ? 'text-jade-600 dark:text-jade-400' : 'text-coral-600'}`}>{formatGrowth(growth)}</p>
              </div>
            </div>
            {/* Read-only months-paid summary for the current year (edit in the card). */}
            {(() => {
              const yr = new Date().getFullYear();
              const paid = new Set(account.paidMonths[String(yr)] ?? []);
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium">Months paid · {yr}</p>
                    <p className="text-[11px] text-ink-muted"><span className="font-semibold text-ink">{paid.size}</span>/12</p>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {MONTH_LABELS.map((label, i) => {
                      const isPaid = paid.has(i + 1);
                      return (
                        <span
                          key={i}
                          title={`${label}: ${isPaid ? 'paid' : 'unpaid'}`}
                          className={`text-[9px] font-medium text-center py-1 rounded ${
                            isPaid
                              ? 'bg-jade-500 text-white dark:bg-jade-600'
                              : 'bg-paper-soft/60 text-ink-muted border border-rule'
                          }`}
                        >
                          {label[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT: dated history log + pager */}
          <div className="flex-1 min-h-0 flex flex-col border-t sm:border-t-0 border-rule">
            <p className="text-[10px] uppercase tracking-wider text-ink-muted font-medium px-5 pt-4 pb-1 sm:pt-5">History</p>
            <div className="sm:overflow-y-auto px-3 pb-3 flex-1 sm:min-h-[160px]">
              {loading ? (
                <p className="text-sm text-ink-muted text-center py-8">Loading history…</p>
              ) : (
                <ul className="space-y-1">
                  {pageItems.map((p, i) => {
                    const g = computeGrowth(p.fundValue, p.contributed);
                    return (
                      <li key={`${p.date}-${i}`} className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-paper-soft transition-colors">
                        <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${g.up ? 'bg-jade-50 text-jade-600 dark:bg-jade-900/40 dark:text-jade-400' : 'bg-coral-50 text-coral-600 dark:bg-coral-900/40 dark:text-coral-400'}`}>
                          {g.up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink leading-tight">{formatDateString(p.date)}</p>
                          <p className="text-[11px] text-ink-muted truncate">
                            {p.delta === null ? 'First recorded' : `${p.delta >= 0 ? '+' : '−'}${formatCurrency(Math.abs(p.delta))} since previous`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="num text-sm font-semibold text-ink">{formatCurrency(p.fundValue)}</p>
                          <p className={`text-[10px] font-medium ${g.up ? 'text-jade-600 dark:text-jade-400' : 'text-coral-600'}`}>{formatGrowth(g)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {/* Pager */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-rule">
                <span className="text-[11px] text-ink-muted font-mono">{safePage + 1}/{pageCount}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage <= 0} className="p-2.5 rounded-md border border-rule hover:bg-paper-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Previous page">
                    <ChevronLeft className="w-4 h-4 text-ink" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} className="p-2.5 rounded-md border border-rule hover:bg-paper-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Next page">
                    <ChevronRight className="w-4 h-4 text-ink" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

/**
 * Create / edit / delete a custom savings card. Mirrors SavingsDetailModal's
 * overlay shell (backdrop click + Escape close) and BalanceCard's save/validate
 * flow. On save it persists the account first (so a new card always survives),
 * then optionally uploads a background image — image failure is non-fatal and
 * shown as a warning, the card is already saved.
 */
interface CustomCardModalProps {
  account: CustomSavingsAccount | null; // null = create
  onClose: () => void;
  onCreated: (a: CustomSavingsAccount) => void;
  onUpdated: (a: CustomSavingsAccount) => void;
  onDeleted: (id: string) => void;
}

const CustomCardModal: React.FC<CustomCardModalProps> = ({ account, onClose, onCreated, onUpdated, onDeleted }) => {
  const isEdit = account !== null;
  const [name, setName] = useState(account?.name ?? '');
  // For an investment card, `balance` is the CURRENT FUND VALUE.
  const [balance, setBalance] = useState(account ? String(account.balance) : '');
  const [liquidity, setLiquidity] = useState<Liquidity>(account?.liquidity ?? 'liquid');
  const [accountType, setAccountType] = useState<AccountType>(account?.accountType ?? 'savings');
  const [contributed, setContributed] = useState(account ? String(account.contributedValue) : '');
  const [provider, setProvider] = useState(account?.provider ?? '');
  // Paid premium months per year (investment cards). Edited via the grid below.
  const [paidMonths, setPaidMonths] = useState<PaidMonths>(account?.paidMonths ?? {});
  // Which year the months grid is showing. Defaults to the current year.
  const [gridYear, setGridYear] = useState<number>(() => new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(account?.backgroundUrl ?? null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'deleting'>('idle');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const isInvestment = accountType === 'investment';
  // The row once it exists — the incoming account, or one we just created. Once
  // set, re-saving updates it (so an image retry never creates a second row).
  const [persisted, setPersisted] = useState<CustomSavingsAccount | null>(account);
  // Synchronous in-flight lock. `status` is React state and won't update within
  // the same tick, so two rapid Enter presses could both pass a status check;
  // this ref flips synchronously and blocks the second call outright.
  const savingRef = useRef(false);

  // Escape close (disabled mid-write so we don't abandon a save), focus trap,
  // scroll lock, focus restore — see useModal.
  const panelRef = useModal<HTMLDivElement>(onClose, { escapeClosable: status === 'idle' });

  // Local object-URL preview for a newly chosen file; revoked on change/unmount.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const save = async () => {
    if (savingRef.current) return; // re-entrancy guard: Enter can fire before disabled={busy} applies
    // Round to cents up front so the in-memory value matches what the DB stores
    // (numeric(12,2)). Otherwise a >2-decimal input leaves the persisted object
    // out of sync with the rounded snapshot, spawning a phantom history point.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const amountRaw = parseFloat(balance);
    const contributedRaw = isInvestment ? parseFloat(contributed) : 0;
    if (!name.trim()) { setError('Give the card a name.'); return; }
    if (!Number.isFinite(amountRaw) || amountRaw < 0) {
      setError(isInvestment ? 'Enter a valid fund value (0 or more).' : 'Enter a valid amount (0 or more).');
      return;
    }
    if (isInvestment && (!Number.isFinite(contributedRaw) || contributedRaw < 0)) {
      setError('Enter a valid contributed amount (0 or more).'); return;
    }
    const amount = round2(amountRaw);
    const contributedNum = round2(contributedRaw);

    savingRef.current = true;
    setStatus('saving'); setError(''); setWarning('');

    const provTrim = provider.trim() || null;
    const contribVal = isInvestment ? contributedNum : 0;
    // Did the fund value change vs the persisted row? Used to decide whether to
    // append a history snapshot (only for investments, and only on real change).
    const fundChanged = !persisted || persisted.balance !== amount || persisted.contributedValue !== contribVal;

    // Persist the account row first so the card always survives image trouble.
    // Update vs create keys off `persisted` (not the original prop) so an image
    // retry after a successful create never spawns a second row.
    let saved: CustomSavingsAccount;
    const firstTime = persisted === null;
    const patch = {
      name: name.trim(),
      balance: amount,
      liquidity,
      accountType,
      contributedValue: contribVal,
      provider: provTrim,
      // Only investment cards carry months; clear on a plain savings card.
      paidMonths: isInvestment ? paidMonths : {},
    };
    if (persisted) {
      const res = await updateCustomSavingsAccount(persisted.id, patch);
      if (!res.ok) { savingRef.current = false; setStatus('idle'); setError(res.error); return; }
      saved = { ...persisted, ...patch };
    } else {
      const res = await createCustomSavingsAccount(patch);
      if (!res.ok) { savingRef.current = false; setStatus('idle'); setError(res.error); return; }
      saved = res.value;
    }
    setPersisted(saved);

    // Append a dated growth snapshot for investment cards (non-fatal).
    if (isInvestment && fundChanged) {
      await appendValueSnapshot(saved.id, amount, contribVal, getLocalDateString());
    }

    // Optional background upload — non-fatal.
    let imageFailed = false;
    if (file) {
      const up = await uploadCardBackground(saved.id, file);
      if (up.ok) {
        saved = { ...saved, backgroundPath: up.value.path, backgroundUrl: up.value.url };
        setPersisted(saved);
      } else {
        imageFailed = true;
        setWarning(`Card saved, but the image didn't upload: ${up.error}`);
      }
    }

    // The parent list gets a create only the first time; afterward it's updates.
    if (firstTime) onCreated(saved); else onUpdated(saved);

    // If the image failed, keep the modal open to show the warning. Clear the
    // pending file AND reset the preview to the saved image (or none) — leaving
    // it pointed at the object URL we're about to revoke would render blank.
    if (imageFailed) {
      setFile(null);
      setPreview(saved.backgroundUrl ?? null);
      savingRef.current = false;
      setStatus('idle');
      return;
    }
    onClose();
  };

  const remove = async () => {
    if (savingRef.current) return;
    if (!persisted) { onClose(); return; }
    savingRef.current = true;
    setStatus('deleting'); setError('');
    const res = await deleteCustomSavingsAccount(persisted.id, persisted.backgroundPath);
    if (!res.ok) { savingRef.current = false; setStatus('idle'); setError(res.error); return; }
    // Drops it from the parent list whether it was pre-existing or just created.
    onDeleted(persisted.id);
    onClose();
  };

  const busy = status !== 'idle';

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={() => { if (!busy) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit savings card' : 'Add savings card'}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-paper w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-rule shadow-paper-lift max-h-[90vh] overflow-y-auto flex flex-col animate-fade-up focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div>
            <p className="text-xs text-ink-muted mb-0.5">{isInvestment ? 'Investment / insurance card' : 'Savings card'}</p>
            <h3 className="font-display text-lg text-ink tracking-tight">
              {isEdit ? 'Edit card' : isInvestment ? 'New investment card' : 'New savings card'}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-2.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors shrink-0 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Card type — plain savings vs a market-value investment/VUL. Switching
              to investment defaults liquidity to non-liquid (you can override). */}
          <div>
            <span className="text-xs font-medium text-ink-soft">Card type</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([
                { key: 'savings' as const, label: 'Savings', hint: 'A simple pot' },
                { key: 'investment' as const, label: 'Investment / VUL', hint: 'Tracks market growth' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setAccountType(opt.key);
                    // Sensible default: investments are non-liquid assets.
                    if (opt.key === 'investment' && liquidity === 'liquid') setLiquidity('nonliquid');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                    accountType === opt.key
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper-soft/60 text-ink-soft border-rule hover:border-ink/30'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className={`block text-[10px] font-normal ${accountType === opt.key ? 'text-paper/70' : 'text-ink-muted'}`}>{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Name</span>
            <input
              type="text" maxLength={60} value={name} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder={isInvestment ? 'e.g. Prulife VUL' : 'e.g. House fund'}
              className="mt-1 w-full bg-paper-soft/60 rounded-lg px-3 py-2.5 border border-rule outline-none text-ink text-sm focus:border-ink/30 transition-colors"
            />
          </label>

          {/* Provider — investment cards only */}
          {isInvestment && (
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Provider <span className="text-ink-muted font-normal">(optional)</span></span>
              <input
                type="text" maxLength={60} value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Prulife"
                className="mt-1 w-full bg-paper-soft/60 rounded-lg px-3 py-2.5 border border-rule outline-none text-ink text-sm focus:border-ink/30 transition-colors"
              />
            </label>
          )}

          {/* Balance / Fund value */}
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">{isInvestment ? 'Current fund value' : 'Balance'}</span>
            <div className="mt-1 flex items-baseline gap-1.5 bg-paper-soft/60 rounded-lg px-3 py-2.5 border border-rule focus-within:border-ink/30 transition-colors">
              <span className="text-ink-muted font-mono text-lg">₱</span>
              <input
                type="number" step="0.01" min="0" value={balance}
                onChange={(e) => setBalance(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
                placeholder="0.00"
                className="flex-1 bg-transparent border-0 outline-none num text-xl text-ink font-semibold placeholder:text-ink-whisper"
              />
            </div>
            {isInvestment && (
              <p className="text-[11px] text-ink-muted mt-1.5">What the fund is worth today. Updating this saves a dated snapshot for the growth chart.</p>
            )}
          </label>

          {/* Contributed + growth readout — investment cards only */}
          {isInvestment && (
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Total contributed</span>
              <div className="mt-1 flex items-baseline gap-1.5 bg-paper-soft/60 rounded-lg px-3 py-2.5 border border-rule focus-within:border-ink/30 transition-colors">
                <span className="text-ink-muted font-mono text-lg">₱</span>
                <input
                  type="number" step="0.01" min="0" value={contributed}
                  onChange={(e) => setContributed(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent border-0 outline-none num text-xl text-ink font-semibold placeholder:text-ink-whisper"
                />
              </div>
              {(() => {
                const fv = parseFloat(balance), cv = parseFloat(contributed);
                if (!Number.isFinite(fv) || !Number.isFinite(cv) || cv <= 0) {
                  return <p className="text-[11px] text-ink-muted mt-1.5">What you've paid in so far. Growth = fund value − contributed.</p>;
                }
                const g = computeGrowth(fv, cv);
                return (
                  <p className={`text-[11px] mt-1.5 inline-flex items-center gap-1 font-medium ${g.up ? 'text-jade-600 dark:text-jade-400' : 'text-coral-600'}`}>
                    {g.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {g.up ? 'Growth' : 'Down'} {formatGrowth(g)}
                  </p>
                );
              })()}
            </label>
          )}

          {/* Months paid — investment cards only. A Jan–Dec grid per year; tap a
              month to toggle it paid. Stored as { year: [months] } on the card. */}
          {isInvestment && (() => {
            const yearKey = String(gridYear);
            const paid = new Set(paidMonths[yearKey] ?? []);
            const toggleMonth = (m: number) => {
              setPaidMonths(prev => {
                const cur = new Set(prev[yearKey] ?? []);
                if (cur.has(m)) cur.delete(m); else cur.add(m);
                const next = { ...prev };
                const arr = Array.from(cur).sort((a, b) => a - b);
                if (arr.length > 0) next[yearKey] = arr; else delete next[yearKey];
                return next;
              });
            };
            const allPaid = paid.size === 12;
            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-ink-soft">Months paid</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGridYear(y => y - 1)}
                      className="p-1.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors"
                      aria-label="Previous year"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="num text-sm font-medium text-ink tabular-nums w-12 text-center select-none">{gridYear}</span>
                    <button
                      type="button"
                      onClick={() => setGridYear(y => y + 1)}
                      className="p-1.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors"
                      aria-label="Next year"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTH_LABELS.map((label, i) => {
                    const m = i + 1;
                    const isPaid = paid.has(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMonth(m)}
                        aria-pressed={isPaid}
                        className={`relative px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          isPaid
                            ? 'bg-jade-500 text-white border-jade-500 dark:bg-jade-600 dark:border-jade-600'
                            : 'bg-paper-soft/60 text-ink-soft border-rule hover:border-ink/30'
                        }`}
                      >
                        {isPaid && <Check className="w-3 h-3 absolute top-1 right-1" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-ink-muted">
                    <span className="font-semibold text-ink">{paid.size}</span> of 12 paid · {gridYear}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaidMonths(prev => {
                      const next = { ...prev };
                      if (allPaid) delete next[yearKey];
                      else next[yearKey] = [1,2,3,4,5,6,7,8,9,10,11,12];
                      return next;
                    })}
                    className="text-[11px] font-medium text-ink-soft hover:text-ink transition-colors"
                  >
                    {allPaid ? 'Clear all' : 'Mark all'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Liquidity toggle */}
          <div>
            <span className="text-xs font-medium text-ink-soft">Liquidity</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['liquid', 'nonliquid'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLiquidity(opt)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    liquidity === opt
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper-soft/60 text-ink-soft border-rule hover:border-ink/30'
                  }`}
                >
                  {opt === 'liquid' ? 'Liquid' : 'Non-liquid'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-muted mt-1.5 leading-relaxed">
              {isInvestment
                ? 'Investments are usually non-liquid — kept out of expense funding, but you can still transfer money in.'
                : 'Liquid = you can reach it now. Non-liquid = locked away (like Pag-IBIG MP2).'}
            </p>
          </div>

          {/* Background image */}
          <div>
            <span className="text-xs font-medium text-ink-soft">Background image <span className="text-ink-muted font-normal">(optional)</span></span>
            <label className="mt-1 relative flex items-center gap-3 rounded-lg border border-dashed border-rule px-3 py-3 cursor-pointer hover:border-ink/30 hover:bg-paper-soft/40 transition-colors overflow-hidden">
              {preview && (
                <div className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none" style={{ backgroundImage: `url(${preview})` }} />
              )}
              <span className="relative w-9 h-9 rounded-md bg-paper-soft text-ink-soft flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4" />
              </span>
              <span className="relative text-xs text-ink-soft">
                {file ? file.name : preview ? 'Change background image' : 'Upload a background image (max 5MB)'}
              </span>
              <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
            </label>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {warning && <p className="text-xs text-gold-600 dark:text-gold-400">{warning}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-5 border-t border-rule">
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 bg-ink hover:bg-ink-soft text-paper px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {status === 'saving'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Check className="w-4 h-4" />}
            <span>{isEdit ? 'Save changes' : 'Create card'}</span>
          </button>
          {persisted && (
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-600 border border-rule hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-60 ml-auto"
            >
              {status === 'deleting'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />}
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

/**
 * Loading skeleton — mirrors the real tab layout (headline, two money cards, the
 * savings grid) with pulsing placeholders so the page doesn't jump when data
 * lands. Uses the same paper/rule tokens and rounding as the real surfaces.
 */
const Bar: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`rounded bg-ink/10 dark:bg-paper/10 ${className ?? ''}`} />
);

const SkeletonSavingsCard: React.FC = () => (
  <div className="relative bg-paper rounded-xl border border-rule p-5 min-h-[132px]">
    {/* corner badge, matching the real cards' upper-right image/logo slot */}
    <div className="absolute top-5 right-5 h-12 w-12 rounded-lg bg-ink/10 dark:bg-paper/10" />
    <Bar className="h-3 w-24 mb-4" />
    <Bar className="h-6 w-28 mb-3" />
    <Bar className="h-2.5 w-20" />
  </div>
);

const NetWorthSkeleton: React.FC = () => (
  <div className="max-w-5xl mx-auto space-y-4 animate-pulse" aria-busy="true" aria-label="Loading net worth">
    {/* Headline */}
    <div className="rounded-2xl p-6 sm:p-8 bg-paper border border-rule ring-1 ring-ink/5">
      <Bar className="h-3 w-28 mb-5" />
      <Bar className="h-10 w-56 mb-5" />
      <div className="flex gap-4 mb-6">
        <Bar className="h-3 w-24" />
        <Bar className="h-3 w-28" />
      </div>
      <div className="pt-5 border-t border-rule">
        <Bar className="h-2 w-full rounded-full mb-3" />
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => <Bar key={i} className="h-2.5 w-28" />)}
        </div>
      </div>
    </div>
    {/* Money cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-paper rounded-xl border border-rule p-5 sm:p-6 min-h-[132px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-ink/10 dark:bg-paper/10" />
            <Bar className="h-3.5 w-40" />
          </div>
          <Bar className="h-8 w-36 mt-4" />
        </div>
      ))}
    </div>
    {/* Savings grid */}
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <Bar className="h-3.5 w-16" />
        <Bar className="h-3 w-24" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonSavingsCard key={i} />)}
      </div>
    </div>
  </div>
);

/**
 * Move money between the user's own pots (bank-transfer-to-self). Mirrors the
 * overlay shell of the other modals (backdrop + Escape close). Picks a `from`
 * and a `to` pot, validates the amount against the source balance, and calls
 * onTransfer. Net worth is unchanged — only the split between pots moves.
 */
interface TransferModalProps {
  /** All pots — valid transfer DESTINATIONS (incl. investment/VUL cards). */
  pots: FundingSource[];
  /** Pots valid as a SOURCE — excludes investment cards (transfer-in only). */
  fromPots: FundingSource[];
  onClose: () => void;
  onTransfer: NonNullable<NetWorthTabProps['onTransfer']>;
}

const TransferModal: React.FC<TransferModalProps> = ({ pots, fromPots, onClose, onTransfer }) => {
  const [fromKey, setFromKey] = useState(fromPots[0]?.key ?? '');
  // Default the destination to the first pot that isn't the chosen source.
  const [toKey, setToKey] = useState(pots.find(p => p.key !== (fromPots[0]?.key ?? ''))?.key ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  // Escape close (disabled mid-save), focus trap, scroll lock, focus restore.
  const panelRef = useModal<HTMLDivElement>(onClose, { escapeClosable: status !== 'saving' });

  const from = fromPots.find(p => p.key === fromKey) ?? null;
  const to = pots.find(p => p.key === toKey) ?? null;
  const amt = parseFloat(amount);
  const samePot = fromKey !== '' && fromKey === toKey;
  const overspend = from != null && Number.isFinite(amt) && amt > from.balance;
  const invalid = !from || !to || samePot || !Number.isFinite(amt) || amt <= 0 || overspend;

  const submit = async () => {
    if (savingRef.current || invalid || !from || !to) return;
    savingRef.current = true;
    setStatus('saving'); setError('');
    const res = await onTransfer(from.source, to.source, amt, date, note.trim() || undefined);
    if (!res.ok) { savingRef.current = false; setStatus('idle'); setError(res.error ?? 'Transfer failed.'); return; }
    setStatus('done');
    setTimeout(onClose, 700);
  };

  const inputClass = 'w-full bg-paper-soft/60 rounded-lg px-3 py-2.5 border border-rule outline-none text-ink text-sm focus:border-ink/30 transition-colors';

  // Only a backdrop click that also STARTED on the backdrop closes the modal.
  // Without this, drag-selecting text inside an input and releasing over the
  // backdrop registers as a click and dismisses the dialog. We record where the
  // press began and require both ends to be the backdrop itself.
  const backdropMouseDown = useRef(false);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onMouseDown={(e) => { backdropMouseDown.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (status === 'saving') return;
        if (e.target === e.currentTarget && backdropMouseDown.current) onClose();
        backdropMouseDown.current = false;
      }}
      role="dialog" aria-modal="true" aria-label="Move money between accounts"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-paper w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-rule shadow-paper-lift max-h-[90vh] overflow-y-auto flex flex-col animate-fade-up focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div>
            <p className="text-xs text-ink-muted mb-0.5">Bank transfer to self</p>
            <h3 className="font-display text-lg text-ink tracking-tight">Move money</h3>
          </div>
          <button onClick={onClose} disabled={status === 'saving'} className="p-2.5 rounded-md hover:bg-paper-soft text-ink-muted hover:text-ink transition-colors shrink-0 disabled:opacity-40" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* From → To */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="block min-w-0">
              <span className="text-xs font-medium text-ink-soft">From</span>
              <select value={fromKey} onChange={(e) => setFromKey(e.target.value)} className={`${inputClass} mt-1`}>
                {fromPots.map(p => <option key={p.key} value={p.key}>{p.source.label}</option>)}
              </select>
            </label>
            <span className="pb-2.5 text-ink-muted"><ArrowRight className="w-4 h-4" /></span>
            <label className="block min-w-0">
              <span className="text-xs font-medium text-ink-soft">To</span>
              <select value={toKey} onChange={(e) => setToKey(e.target.value)} className={`${inputClass} mt-1`}>
                {pots.map(p => <option key={p.key} value={p.key}>{p.source.label}</option>)}
              </select>
            </label>
          </div>
          {from && (
            <p className="text-[11px] text-ink-muted -mt-1.5">
              {from.source.label} has {formatCurrency(from.balance)} available.
            </p>
          )}

          {/* Amount */}
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Amount</span>
            <div className={`mt-1 flex items-baseline gap-1.5 bg-paper-soft/60 rounded-lg px-3 py-2.5 border transition-colors ${overspend ? 'border-coral-400' : 'border-rule focus-within:border-ink/30'}`}>
              <span className="text-ink-muted font-mono text-lg">₱</span>
              <input
                type="number" step="0.01" min="0" value={amount} autoFocus
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="0.00"
                className="flex-1 bg-transparent border-0 outline-none num text-xl text-ink font-semibold placeholder:text-ink-whisper"
              />
            </div>
          </label>

          {/* Date + note */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-soft">Note <span className="text-ink-muted font-normal">(optional)</span></span>
              <input type="text" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. top up savings" className={`${inputClass} mt-1`} />
            </label>
          </div>

          {samePot && <p className="text-xs text-coral-600">Pick two different accounts.</p>}
          {overspend && !samePot && <p className="text-xs text-coral-600">Only {formatCurrency(from!.balance)} available in {from!.source.label}.</p>}
          {error && <p className="text-xs text-coral-600">{error}</p>}
        </div>

        <div className="flex items-center gap-2 p-5 border-t border-rule">
          <button
            onClick={submit}
            disabled={invalid || status !== 'idle'}
            className="inline-flex items-center gap-1.5 bg-ink hover:bg-ink-soft text-paper px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : status === 'done' ? <Check className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
            <span>{status === 'done' ? 'Moved' : 'Move money'}</span>
          </button>
          <button onClick={onClose} disabled={status === 'saving'} className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink border border-rule hover:bg-paper-soft px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
            Cancel
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

/**
 * Net Worth = money on your wallet (cash on hand) + everything you've set aside.
 * The savings buckets (Emergency Fund, General Savings, Pag-IBIG MP2) are kept
 * separate but all count toward the total — so money you saved stops looking
 * like a spent expense and shows up as part of what you actually own.
 */
export const NetWorthTab: React.FC<NetWorthTabProps> = ({ data, active = true, pots = [], onTransfer }) => {
  const [transferOpen, setTransferOpen] = useState(false);
  // Bumped after an in-tab transfer so this tab re-pulls its own stored balances
  // (wallet/debit/custom); the computed buckets refresh via `data` props already.
  const [refreshTick, setRefreshTick] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [debit, setDebit] = useState(0);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  // Which savings bucket's detail modal is open (null = none).
  const [openBucket, setOpenBucket] = useState<{ bucket: SavingsBucket; title: string } | null>(null);
  // User-created custom savings cards (own table, count toward net worth).
  const [customAccounts, setCustomAccounts] = useState<CustomSavingsAccount[]>([]);
  const [customLoaded, setCustomLoaded] = useState(false);
  // Create/edit modal: { account } where account=null means "create new".
  const [customEditor, setCustomEditor] = useState<{ account: CustomSavingsAccount | null } | null>(null);
  // Investment card whose growth-detail modal is open (null = none).
  const [openInvestment, setOpenInvestment] = useState<CustomSavingsAccount | null>(null);

  // Re-fetch whenever the tab becomes active. The panel stays mounted while
  // hidden, so an expense logged elsewhere (which deducts from wallet/debit/a
  // custom card) would otherwise leave these stored balances stale here.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    loadWalletBalances().then((res) => {
      if (cancelled) return;
      if (res.ok) { setWallet(res.balances.wallet); setDebit(res.balances.debit); }
      setBalancesLoaded(true);
    });
    loadCustomSavingsAccounts().then((res) => {
      if (cancelled) return;
      if (res.ok) setCustomAccounts(res.value);
      setCustomLoaded(true);
    });
    return () => { cancelled = true; };
  }, [active, refreshTick]);

  // The whole tab depends on both the wallet balances and the custom accounts;
  // show the skeleton until both first-loads have settled.
  const loading = !balancesLoaded || !customLoaded;

  const savings = useMemo(
    () => getSavingsBreakdown(data.incomeHistory, data.expenses),
    [data.incomeHistory, data.expenses],
  );

  // Custom accounts are savings too — each carries its own liquidity flag.
  const customTotal = customAccounts.reduce((s, a) => s + a.balance, 0);
  const customNonLiquid = customAccounts
    .filter(a => a.liquidity === 'nonliquid')
    .reduce((s, a) => s + a.balance, 0);
  // The savings figure shown/summed across the tab includes custom accounts.
  const savingsTotal = savings.total + customTotal;

  const netWorth = wallet + debit + savingsTotal;

  // Liquid = money reachable now (wallet, debit, EF, General, Other, liquid customs).
  // Non-liquid = money locked away (Pag-IBIG MP2 + any non-liquid custom accounts).
  const nonLiquid = savings.pagibigMP2 + customNonLiquid;
  const liquid = netWorth - nonLiquid;
  const liquidPct = netWorth > 0 ? Math.round((liquid / netWorth) * 100) : 0;
  const nonLiquidPct = netWorth > 0 ? 100 - liquidPct : 0;

  // Persist callback shared by both balance cards.
  const handleBalanceSaved = (field: BalanceField, value: number) => {
    if (field === 'wallet') setWallet(value);
    else setDebit(value);
  };

  // Optimistic refresh after a custom-card mutation — no re-fetch needed.
  const handleCustomCreated = (account: CustomSavingsAccount) =>
    setCustomAccounts(prev => [...prev, account]);
  const handleCustomUpdated = (account: CustomSavingsAccount) =>
    setCustomAccounts(prev => prev.map(a => (a.id === account.id ? account : a)));
  const handleCustomDeleted = (id: string) =>
    setCustomAccounts(prev => prev.filter(a => a.id !== id));

  // Savings buckets — separate, but each contributes to total_savings.
  // `bucket` maps the card to getSavingsContributions()'s bucket key.
  const buckets = [
    { key: 'ef', bucket: 'emergencyFund' as SavingsBucket, label: 'Emergency Fund', value: savings.emergencyFund, icon: <Shield className="w-4 h-4" />, tone: 'jade' as const, liquidity: 'liquid' as const },
    { key: 'gs', bucket: 'generalSavings' as SavingsBucket, label: 'General Savings', value: savings.generalSavings, icon: <PiggyBank className="w-4 h-4" />, tone: 'jade' as const, liquidity: 'liquid' as const },
    { key: 'mp2', bucket: 'pagibigMP2' as SavingsBucket, label: 'Pag-IBIG MP2', value: savings.pagibigMP2, icon: <Landmark className="w-4 h-4" />, tone: 'gold' as const, liquidity: 'nonliquid' as const },
    ...(savings.other > 0
      ? [{ key: 'other', bucket: 'other' as SavingsBucket, label: 'Other Savings', value: savings.other, icon: <Coins className="w-4 h-4" />, tone: 'neutral' as const, liquidity: 'liquid' as const }]
      : []),
  ];

  // Small pill shown next to a bucket label indicating whether the money is
  // reachable now (EF, General Savings, Other) or locked away (Pag-IBIG MP2).
  const LiquidityBadge: React.FC<{ liquidity: 'liquid' | 'nonliquid' }> = ({ liquidity }) =>
    liquidity === 'liquid' ? (
      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-400">
        Liquid
      </span>
    ) : (
      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-paper-soft text-ink-soft dark:bg-ink/40 dark:text-ink-muted">
        Non-liquid
      </span>
    );

  const openDetail = (bucket: SavingsBucket, title: string) => setOpenBucket({ bucket, title });

  const toneClasses: Record<string, string> = {
    jade: 'bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-400',
    gold: 'bg-gold-50 text-gold-600 dark:bg-gold-500/15 dark:text-gold-400',
    neutral: 'bg-paper-soft text-ink-soft',
  };

  // Composition of net worth — each component separated, brand-matched colors:
  //   Wallet = grey · Debit = MariBank orange · EF = GoTyme blue ·
  //   General Savings = green · Pag-IBIG MP2 = Pag-IBIG purple.
  const pctOf = (v: number) => (netWorth > 0 ? (v / netWorth) * 100 : 0);
  const composition = [
    { key: 'wallet', label: 'Wallet',          value: wallet,                 color: '#9ca3af' },
    { key: 'debit',  label: 'Debit Card',      value: debit,                  color: MARI_ORANGE },
    { key: 'ef',     label: 'Emergency Fund',   value: savings.emergencyFund, color: GOTYME_CYAN },
    { key: 'gs',     label: 'General Savings',  value: savings.generalSavings, color: '#22c55e' },
    { key: 'mp2',    label: 'Pag-IBIG MP2',     value: savings.pagibigMP2,    color: MP2_INDIGO },
    ...(savings.other > 0
      ? [{ key: 'other', label: 'Other Savings', value: savings.other,        color: '#6b7280' }]
      : []),
    // User-created cards, each its own composition segment.
    ...customAccounts.map(a => ({ key: `custom-${a.id}`, label: a.name, value: a.balance, color: '#64748b' })),
  ].filter(seg => seg.value > 0);

  // Shared hover/focus styling for every clickable savings card (buckets + customs).
  const cardBase = 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-paper-lift hover:border-ink/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20';

  // Pots valid as a transfer SOURCE: everything except investment/VUL cards
  // (those are transfer-in only). Investment card keys are `custom:<id>`.
  const investmentKeys = new Set(
    customAccounts.filter(a => a.accountType === 'investment').map(a => `custom:${a.id}`),
  );
  const sourcePots = pots.filter(p => !investmentKeys.has(p.key));

  if (loading) return <NetWorthSkeleton />;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Headline: Net Worth — stylish monochrome gradient that inverts by theme.
          Light: soft silver (white→light-grey) with ink text.
          Dark:  deep black (black→charcoal) with white text.
          The composition bar below keeps each savings type's brand color. */}
      <div
        className="nw-card relative rounded-2xl p-6 sm:p-8 overflow-hidden ring-1 transition-colors
                   text-ink ring-ink/10 shadow-[0_10px_40px_-16px_rgba(0,0,0,0.28)]
                   bg-gradient-to-br from-white via-neutral-200 to-neutral-400
                   dark:text-white dark:ring-white/10 dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]
                   dark:bg-gradient-to-br dark:from-neutral-950 dark:via-neutral-800 dark:to-neutral-600"
      >
        {/* Sheen: a soft diagonal highlight. Keeps the gradient readable — a
            light top-left glint in both themes, not a full wash that flattens it. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 dark:via-white/[0.06] dark:to-white/[0.14]" />
        {/* Two faint radial glows give the surface depth in both themes. */}
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/40 blur-3xl dark:bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-ink/[0.06] blur-3xl dark:bg-white/[0.05]" />

        <div className="relative flex items-center justify-between gap-3 mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70 dark:text-white/50">Your net worth</p>
          {onTransfer && pots.length >= 2 && (
            <button
              onClick={() => setTransferOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors shrink-0
                         border-ink/15 text-ink-soft hover:text-ink hover:bg-ink/5
                         dark:border-white/20 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Move money
            </button>
          )}
        </div>
        <p className="relative num font-semibold text-4xl sm:text-5xl tracking-tight bg-clip-text text-transparent animate-count-pop
                      bg-gradient-to-b from-ink to-ink/70 dark:from-white dark:to-white/70">
          {balancesLoaded ? formatCurrency(netWorth) : '—'}
        </p>

        {/* Liquid vs non-liquid split — how much you can reach now vs locked away */}
        {balancesLoaded && netWorth > 0 && (
          <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-ink-soft dark:text-white/70">
              <span className="w-2 h-2 rounded-full bg-ink dark:bg-white" />
              <span className="font-semibold text-ink dark:text-white/90">{liquidPct}% liquid</span>
              <span className="text-ink-muted dark:text-white/45">{formatCurrency(liquid)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-ink-soft dark:text-white/70">
              <span className="w-2 h-2 rounded-full bg-ink/35 dark:bg-white/35" />
              <span className="font-semibold text-ink dark:text-white/90">{nonLiquidPct}% non-liquid</span>
              <span className="text-ink-muted dark:text-white/45">{formatCurrency(nonLiquid)}</span>
            </span>
          </div>
        )}

        {/* Composition bar — wallet + debit + each savings bucket. The card
            itself is monochrome, but the bar keeps each savings type's own
            brand color so segments stay identifiable in both themes. */}
        <div className="relative mt-6 pt-5 border-t border-ink/10 dark:border-white/10">
          <div className="flex h-2 rounded-full overflow-hidden bg-ink/10 dark:bg-white/10">
            {composition.map(seg => (
              <div
                key={seg.key}
                className="transition-all duration-700"
                style={{ width: `${pctOf(seg.value)}%`, backgroundColor: seg.color }}
                title={`${seg.label} ${formatCurrency(seg.value)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
            {composition.map(seg => (
              <span key={seg.key} className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft dark:text-white/70">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} /> {seg.label} {formatCurrency(seg.value)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Money cards — cash wallet + debit card (separate balances) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BalanceCard
          field="wallet"
          title="Money on my wallet"
          hint="Cash on hand right now. Update it whenever it changes."
          icon={<Wallet className="w-4 h-4" />}
          value={wallet}
          loaded={balancesLoaded}
          onSaved={handleBalanceSaved}
          badge={<LiquidityBadge liquidity="liquid" />}
          extra={
            <div className="mt-3 flex items-center gap-4">
              <span className="num text-sm font-medium text-ink-soft">
                {balancesLoaded ? `$${wallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <UsFlag className="h-4 w-auto rounded-[3px]" />
                <AuFlag className="h-4 w-auto rounded-[3px]" />
              </span>
            </div>
          }
        />
        <BalanceCard
          field="debit"
          title="Debit Card"
          hint="Balance in your debit account. Kept separate from wallet cash."
          icon={<CreditCard className="w-4 h-4" />}
          value={debit}
          loaded={balancesLoaded}
          onSaved={handleBalanceSaved}
          badge={<LiquidityBadge liquidity="liquid" />}
          background={<MariBankCard className="absolute inset-0 w-full h-full opacity-[0.14] dark:opacity-20 pointer-events-none" />}
        />
      </div>

      {/* Savings buckets — separate, all counted */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium text-ink">Savings</h2>
          <span className="text-xs text-ink-muted font-mono">{formatCurrency(savingsTotal)} total</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {buckets.map((b) => {
            const pct = savingsTotal > 0 ? `${Math.round((b.value / savingsTotal) * 100)}% of savings` : 'Counted as savings';

            // Shared click behavior — every savings card opens its detail modal.
            const clickProps = {
              role: 'button' as const,
              tabIndex: 0,
              onClick: () => openDetail(b.bucket, b.label),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(b.bucket, b.label); }
              },
              'aria-label': `${b.label}: ${formatCurrency(b.value)}. View contribution dates.`,
            };

            // EF & GS — the full GoTyme VISA card artwork as a low-opacity background.
            // `meet` fits the whole card design inside (nothing cropped); a faint
            // cyan wash fills the letterbox so the card reads as one surface.
            // EF & GS — the GoTyme card artwork as a SOLID upper-right badge,
            // same slot/size/rounding as the MP2 logo (not a faded background).
            if (b.key === 'ef' || b.key === 'gs') {
              return (
                <div key={b.key} {...clickProps} className={`relative overflow-hidden bg-paper rounded-xl border border-rule p-5 ${cardBase}`}>
                  {/* Mobile: brand art fills the card as a low-opacity background
                      (no cramped corner badge). Hidden from sm up, where it
                      returns to the upper-right badge slot. */}
                  <GoTymeCard className="sm:hidden absolute inset-0 w-full h-full object-cover opacity-[0.12] dark:opacity-20 pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 pt-0.5 min-w-0">
                        <p className="text-xs font-medium text-ink-muted leading-tight truncate">{b.label}</p>
                        <LiquidityBadge liquidity={b.liquidity} />
                      </div>
                      {/* Corner badge — sm and up only (mobile uses the full-bleed bg). */}
                      <GoTymeCard className="hidden sm:block w-24 h-auto shrink-0 rounded-lg" />
                    </div>
                    <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(b.value)}</p>
                    <p className="text-[11px] text-ink-muted mt-1.5 flex items-center justify-between">
                      <span>{pct}</span>
                      <span className="text-ink-soft/70 font-medium">View dates →</span>
                    </p>
                  </div>
                </div>
              );
            }

            // MP2 — the full Pag-IBIG MP2 logo replaces the corner icon, at full size.
            if (b.key === 'mp2') {
              return (
                <div key={b.key} {...clickProps} className={`relative overflow-hidden bg-paper rounded-xl border border-rule p-5 ${cardBase}`}>
                  {/* Mobile: MP2 logo fills the card as a low-opacity background. */}
                  <Mp2Logo className="sm:hidden absolute inset-0 w-full h-full object-cover opacity-[0.12] dark:opacity-20 pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 pt-0.5 min-w-0">
                        <p className="text-xs font-medium text-ink-muted leading-tight">{b.label}</p>
                        <LiquidityBadge liquidity={b.liquidity} />
                      </div>
                      {/* Corner badge — sm and up only. */}
                      <Mp2Logo className="hidden sm:block h-12 w-auto shrink-0 rounded-lg" />
                    </div>
                    <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(b.value)}</p>
                    <p className="text-[11px] text-ink-muted mt-1.5 flex items-center justify-between">
                      <span>{pct}</span>
                      <span className="text-ink-soft/70 font-medium">View dates →</span>
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={b.key} {...clickProps} className={`bg-paper rounded-xl border border-rule p-5 ${cardBase}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-ink-muted leading-tight">{b.label}</p>
                    <LiquidityBadge liquidity={b.liquidity} />
                  </div>
                  <span className={`${toneClasses[b.tone]} w-7 h-7 rounded-md flex items-center justify-center shrink-0`}>
                    {b.icon}
                  </span>
                </div>
                <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(b.value)}</p>
                <p className="text-[11px] text-ink-muted mt-1.5 flex items-center justify-between">
                  <span>{pct}</span>
                  <span className="text-ink-soft/70 font-medium">View dates →</span>
                </p>
              </div>
            );
          })}

          {/* User-created cards. With an uploaded image it renders full-bleed as a
              low-opacity background (like the GoTyme cards); with no image it uses
              the same corner-mark placeholder treatment as the Pag-IBIG MP2 card. */}
          {customAccounts.map((a) => {
            const pct = savingsTotal > 0 ? `${Math.round((a.balance / savingsTotal) * 100)}% of savings` : 'Counted as savings';
            const isInvestment = a.accountType === 'investment';
            // Investments open a growth-detail modal; plain cards open the editor.
            const open = () => isInvestment ? setOpenInvestment(a) : setCustomEditor({ account: a });
            const growth = isInvestment ? computeGrowth(a.balance, a.contributedValue) : null;
            // Months paid this calendar year, for the at-a-glance chip.
            const thisYear = new Date().getFullYear();
            const paidThisYear = isInvestment ? (a.paidMonths[String(thisYear)]?.length ?? 0) : 0;
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                aria-label={`${a.name}: ${formatCurrency(a.balance)}. ${isInvestment ? 'View growth.' : 'Edit card.'}`}
                className={`relative overflow-hidden bg-paper rounded-xl border border-rule p-5 min-h-[132px] ${cardBase}`}
              >
                {/* On mobile an uploaded image fills the card as a low-opacity
                    background; from sm up it returns to a solid upper-right badge
                    (same slot as the MP2 logo). No image → placeholder badge
                    (line chart for investments, PiggyBank for savings). */}
                {a.backgroundUrl && (
                  <img
                    src={a.backgroundUrl}
                    alt=""
                    className="sm:hidden absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-25 pointer-events-none"
                  />
                )}
                {a.backgroundUrl ? (
                  <img
                    src={a.backgroundUrl}
                    alt=""
                    className="hidden sm:block absolute top-5 right-5 h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className={`absolute top-5 right-5 h-12 w-12 shrink-0 rounded-lg flex items-center justify-center ${
                    isInvestment ? 'bg-jade-50 text-jade-600 dark:bg-jade-900/40 dark:text-jade-400' : 'bg-paper-soft text-ink-soft'
                  }`}>
                    {isInvestment ? <LineChart className="w-6 h-6" /> : <PiggyBank className="w-6 h-6" />}
                  </span>
                )}
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-3 pr-14 sm:pr-[72px]">
                    <p className="text-xs font-medium text-ink-muted leading-tight min-w-0 truncate">{a.name}</p>
                    <LiquidityBadge liquidity={a.liquidity} />
                  </div>
                  <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(a.balance)}</p>
                  {isInvestment && growth ? (
                    <>
                      <p className={`text-[11px] mt-1.5 inline-flex items-center gap-1 font-medium ${growth.up ? 'text-jade-600 dark:text-jade-400' : 'text-coral-600'}`}>
                        {growth.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {formatGrowth(growth)}
                      </p>
                      <p className="text-[11px] text-ink-muted mt-1 flex items-center justify-between gap-2">
                        <span className="truncate min-w-0 inline-flex items-center gap-1.5">
                          <span className="truncate">{a.provider ? a.provider : `Contributed ${formatCurrency(a.contributedValue)}`}</span>
                          {paidThisYear > 0 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-jade-50 text-jade-600 dark:bg-jade-900/40 dark:text-jade-400 text-[9px] font-semibold tabular-nums">
                              {paidThisYear}/12 mo
                            </span>
                          )}
                        </span>
                        <span className="text-ink-soft/70 font-medium shrink-0">Details →</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-ink-muted mt-1.5 flex items-center justify-between">
                      <span>{pct}</span>
                      <span className="text-ink-soft/70 font-medium">Edit →</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add a new custom savings / investment card */}
          <button
            onClick={() => setCustomEditor({ account: null })}
            className="rounded-xl border border-dashed border-rule p-5 min-h-[132px] flex flex-col items-center justify-center gap-2 text-ink-muted hover:border-ink/30 hover:text-ink hover:bg-paper-soft/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Add savings / investment</span>
          </button>
        </div>
        <p className="text-xs text-ink-muted mt-3 leading-relaxed">
          Emergency Fund and General Savings include both what you set aside from paychecks and any you logged as expenses.
          Pag-IBIG MP2 counts the contributions you tagged as MP2. All are savings — money you own, not money spent.
          Add an <span className="font-medium text-ink-soft">Investment / VUL</span> card (e.g. Prulife) to track a fund value that changes with the market —
          reopen it any time to see growth vs what you contributed over time.
        </p>
      </div>

      {openBucket && (
        <SavingsDetailModal
          bucket={openBucket.bucket}
          title={openBucket.title}
          data={data}
          onClose={() => setOpenBucket(null)}
          // MP2 gets the Projection tab, seeded with its current balance.
          mp2Balance={openBucket.bucket === 'pagibigMP2' ? savings.pagibigMP2 : undefined}
        />
      )}

      {customEditor && (
        <CustomCardModal
          account={customEditor.account}
          onClose={() => setCustomEditor(null)}
          onCreated={handleCustomCreated}
          onUpdated={handleCustomUpdated}
          onDeleted={handleCustomDeleted}
        />
      )}

      {openInvestment && (
        <InvestmentDetailModal
          account={openInvestment}
          onClose={() => setOpenInvestment(null)}
          onEdit={() => { const a = openInvestment; setOpenInvestment(null); setCustomEditor({ account: a }); }}
        />
      )}

      {transferOpen && onTransfer && (
        <TransferModal
          pots={pots}
          fromPots={sourcePots}
          onClose={() => setTransferOpen(false)}
          onTransfer={async (from, to, amount, date, note) => {
            const res = await onTransfer(from, to, amount, date, note);
            // On success, re-pull this tab's own stored balances so the cards
            // reflect the move without waiting for a tab switch.
            if (res.ok) setRefreshTick(t => t + 1);
            return res;
          }}
        />
      )}
    </div>
  );
};
