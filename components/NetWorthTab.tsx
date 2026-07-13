import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FinancialData } from '../types';
import { formatCurrency, formatDateString, getSavingsBreakdown, getSavingsContributions, type SavingsBucket } from '../lib/utils';
import { loadWalletBalances, saveWalletBalance, type BalanceField } from '../lib/walletStore';
import {
  loadCustomSavingsAccounts,
  createCustomSavingsAccount,
  updateCustomSavingsAccount,
  deleteCustomSavingsAccount,
  uploadCardBackground,
  type CustomSavingsAccount,
  type Liquidity,
} from '../lib/customSavingsStore';
import { Wallet, PiggyBank, Shield, Landmark, Coins, CreditCard, Check, Pencil, X, Banknote, Receipt, ChevronLeft, ChevronRight, Plus, Trash2, ImagePlus, Loader2 } from 'lucide-react';

interface NetWorthTabProps {
  data: FinancialData;
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
 * Detail modal for a savings bucket — lists every contribution (how much + when),
 * newest first, with a running total. Opened by clicking a savings card.
 */
interface SavingsDetailModalProps {
  bucket: SavingsBucket;
  title: string;
  data: FinancialData;
  onClose: () => void;
}

const PAGE_SIZE = 8;

const SavingsDetailModal: React.FC<SavingsDetailModalProps> = ({ bucket, title, data, onClose }) => {
  const contributions = useMemo(
    () => getSavingsContributions(bucket, data.incomeHistory, data.expenses),
    [bucket, data.incomeHistory, data.expenses],
  );
  const total = contributions.reduce((s, c) => s + c.amount, 0);

  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(contributions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageItems = contributions.slice(pageStart, pageStart + PAGE_SIZE);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} contributions`}
    >
      <div
        className="bg-paper w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-rule shadow-paper-lift max-h-[85vh] flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div>
            <p className="text-xs text-ink-muted mb-0.5">Savings contributions</p>
            <h3 className="font-display text-lg text-ink tracking-tight">{title}</h3>
            <p className="num text-2xl font-semibold text-ink mt-1">{formatCurrency(total)}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              {contributions.length} {contributions.length === 1 ? 'contribution' : 'contributions'}
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

        {/* List */}
        <div className="overflow-y-auto p-3 flex-1">
          {contributions.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-10">No contributions recorded yet.</p>
          ) : (
            <ul className="space-y-1">
              {pageItems.map((c, i) => (
                <li key={pageStart + i} className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-paper-soft transition-colors">
                  <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    c.source === 'paycheck'
                      ? 'bg-jade-50 text-jade-600 dark:bg-jade-900/50 dark:text-jade-400'
                      : 'bg-paper-soft text-ink-soft'
                  }`}>
                    {c.source === 'paycheck' ? <Banknote className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink leading-tight">{formatDateString(c.date)}</p>
                    <p className="text-[11px] text-ink-muted truncate">
                      {c.source === 'paycheck' ? 'From paycheck' : (c.description || 'Logged as expense')}
                    </p>
                  </div>
                  <span className="num text-sm font-semibold text-ink shrink-0">{formatCurrency(c.amount)}</span>
                </li>
              ))}
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
              <span className="text-[11px] text-ink-muted font-mono px-1.5 select-none">{safePage + 1}/{pageCount}</span>
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
      </div>
    </div>
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
  const [balance, setBalance] = useState(account ? String(account.balance) : '');
  const [liquidity, setLiquidity] = useState<Liquidity>(account?.liquidity ?? 'liquid');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(account?.backgroundUrl ?? null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'deleting'>('idle');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  // The row once it exists — the incoming account, or one we just created. Once
  // set, re-saving updates it (so an image retry never creates a second row).
  const [persisted, setPersisted] = useState<CustomSavingsAccount | null>(account);
  // Synchronous in-flight lock. `status` is React state and won't update within
  // the same tick, so two rapid Enter presses could both pass a status check;
  // this ref flips synchronously and blocks the second call outright.
  const savingRef = useRef(false);

  // Close on Escape (disabled mid-write so we don't abandon a save).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && status === 'idle') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, status]);

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
    const amount = parseFloat(balance);
    if (!name.trim()) { setError('Give the card a name.'); return; }
    if (!Number.isFinite(amount) || amount < 0) { setError('Enter a valid amount (0 or more).'); return; }

    savingRef.current = true;
    setStatus('saving'); setError(''); setWarning('');

    // Persist the account row first so the card always survives image trouble.
    // Update vs create keys off `persisted` (not the original prop) so an image
    // retry after a successful create never spawns a second row.
    let saved: CustomSavingsAccount;
    const firstTime = persisted === null;
    if (persisted) {
      const res = await updateCustomSavingsAccount(persisted.id, { name: name.trim(), balance: amount, liquidity });
      if (!res.ok) { savingRef.current = false; setStatus('idle'); setError(res.error); return; }
      saved = { ...persisted, name: name.trim(), balance: amount, liquidity };
    } else {
      const res = await createCustomSavingsAccount({ name: name.trim(), balance: amount, liquidity });
      if (!res.ok) { savingRef.current = false; setStatus('idle'); setError(res.error); return; }
      saved = res.value;
    }
    setPersisted(saved);

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
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
      onClick={() => { if (!busy) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit savings card' : 'Add savings card'}
    >
      <div
        className="bg-paper w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-rule shadow-paper-lift max-h-[90vh] overflow-y-auto flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-rule">
          <div>
            <p className="text-xs text-ink-muted mb-0.5">Savings card</p>
            <h3 className="font-display text-lg text-ink tracking-tight">{isEdit ? 'Edit card' : 'New savings card'}</h3>
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
          {/* Name */}
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Name</span>
            <input
              type="text" maxLength={60} value={name} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. House fund"
              className="mt-1 w-full bg-paper-soft/60 rounded-lg px-3 py-2.5 border border-rule outline-none text-ink text-sm focus:border-ink/30 transition-colors"
            />
          </label>

          {/* Balance */}
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Balance</span>
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
          </label>

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
              Liquid = you can reach it now. Non-liquid = locked away (like Pag-IBIG MP2).
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
 * Net Worth = money on your wallet (cash on hand) + everything you've set aside.
 * The savings buckets (Emergency Fund, General Savings, Pag-IBIG MP2) are kept
 * separate but all count toward the total — so money you saved stops looking
 * like a spent expense and shows up as part of what you actually own.
 */
export const NetWorthTab: React.FC<NetWorthTabProps> = ({ data }) => {
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

  useEffect(() => {
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
  }, []);

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

        <div className="relative flex items-center justify-between mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft/70 dark:text-white/50">Your net worth</p>
          <span className="inline-flex items-center gap-1.5 text-ink-soft/70 dark:text-white/50 text-xs font-mono">
            <Wallet className="w-3.5 h-3.5" /> wallet + savings
          </span>
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
            const open = () => setCustomEditor({ account: a });
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                aria-label={`${a.name}: ${formatCurrency(a.balance)}. Edit card.`}
                className={`relative overflow-hidden bg-paper rounded-xl border border-rule p-5 min-h-[132px] ${cardBase}`}
              >
                {/* On mobile an uploaded image fills the card as a low-opacity
                    background; from sm up it returns to a solid upper-right badge
                    (same slot as the MP2 logo). No image → PiggyBank placeholder
                    badge in that slot at all sizes. */}
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
                  <span className="absolute top-5 right-5 h-12 w-12 shrink-0 rounded-lg bg-paper-soft text-ink-soft flex items-center justify-center">
                    <PiggyBank className="w-6 h-6" />
                  </span>
                )}
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-3 pr-14 sm:pr-[72px]">
                    <p className="text-xs font-medium text-ink-muted leading-tight min-w-0 truncate">{a.name}</p>
                    <LiquidityBadge liquidity={a.liquidity} />
                  </div>
                  <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(a.balance)}</p>
                  <p className="text-[11px] text-ink-muted mt-1.5 flex items-center justify-between">
                    <span>{pct}</span>
                    <span className="text-ink-soft/70 font-medium">Edit →</span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* Add a new custom savings card */}
          <button
            onClick={() => setCustomEditor({ account: null })}
            className="rounded-xl border border-dashed border-rule p-5 min-h-[132px] flex flex-col items-center justify-center gap-2 text-ink-muted hover:border-ink/30 hover:text-ink hover:bg-paper-soft/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-medium">Add savings card</span>
          </button>
        </div>
        <p className="text-xs text-ink-muted mt-3 leading-relaxed">
          Emergency Fund and General Savings include both what you set aside from paychecks and any you logged as expenses.
          Pag-IBIG MP2 counts the contributions you tagged as MP2. All three are savings — money you own, not money spent.
          Tap any card to see how much and when you set it aside — or add your own savings card with the tile above.
        </p>
      </div>

      {openBucket && (
        <SavingsDetailModal
          bucket={openBucket.bucket}
          title={openBucket.title}
          data={data}
          onClose={() => setOpenBucket(null)}
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
    </div>
  );
};
