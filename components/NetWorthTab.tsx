import React, { useEffect, useMemo, useState } from 'react';
import { FinancialData } from '../types';
import { formatCurrency, getSavingsBreakdown } from '../lib/utils';
import { loadWalletBalances, saveWalletBalance, type BalanceField } from '../lib/walletStore';
import { Wallet, PiggyBank, Shield, Landmark, Coins, CreditCard, Check, Pencil, X } from 'lucide-react';

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
  onSaved: (field: BalanceField, value: number) => void;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ field, title, hint, icon, value, loaded, background, extra, onSaved }) => {
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
 * Net Worth = money on your wallet (cash on hand) + everything you've set aside.
 * The savings buckets (Emergency Fund, General Savings, Pag-IBIG MP2) are kept
 * separate but all count toward the total — so money you saved stops looking
 * like a spent expense and shows up as part of what you actually own.
 */
export const NetWorthTab: React.FC<NetWorthTabProps> = ({ data }) => {
  const [wallet, setWallet] = useState(0);
  const [debit, setDebit] = useState(0);
  const [balancesLoaded, setBalancesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadWalletBalances().then((res) => {
      if (cancelled) return;
      if (res.ok) { setWallet(res.balances.wallet); setDebit(res.balances.debit); }
      setBalancesLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const savings = useMemo(
    () => getSavingsBreakdown(data.incomeHistory, data.expenses),
    [data.incomeHistory, data.expenses],
  );

  const netWorth = wallet + debit + savings.total;

  // Persist callback shared by both balance cards.
  const handleBalanceSaved = (field: BalanceField, value: number) => {
    if (field === 'wallet') setWallet(value);
    else setDebit(value);
  };

  // Savings buckets — separate, but each contributes to total_savings.
  const buckets = [
    { key: 'ef', label: 'Emergency Fund', value: savings.emergencyFund, icon: <Shield className="w-4 h-4" />, tone: 'jade' as const },
    { key: 'gs', label: 'General Savings', value: savings.generalSavings, icon: <PiggyBank className="w-4 h-4" />, tone: 'jade' as const },
    { key: 'mp2', label: 'Pag-IBIG MP2', value: savings.pagibigMP2, icon: <Landmark className="w-4 h-4" />, tone: 'gold' as const },
    ...(savings.other > 0
      ? [{ key: 'other', label: 'Other Savings', value: savings.other, icon: <Coins className="w-4 h-4" />, tone: 'neutral' as const }]
      : []),
  ];

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
  ].filter(seg => seg.value > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Headline: Net Worth */}
      <div className="relative bg-ink text-paper rounded-xl p-6 sm:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs uppercase tracking-wider text-paper/55">Your net worth</p>
          <span className="inline-flex items-center gap-1.5 text-paper/55 text-xs font-mono">
            <Wallet className="w-3.5 h-3.5" /> wallet + savings
          </span>
        </div>
        <p className="num font-semibold text-4xl sm:text-5xl tracking-tight text-paper animate-count-pop">
          {balancesLoaded ? formatCurrency(netWorth) : '—'}
        </p>

        {/* Composition bar — wallet + debit + each savings bucket, all separated */}
        <div className="mt-6 pt-5 border-t border-paper/10">
          <div className="flex h-2 rounded-full overflow-hidden bg-paper/10">
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
              <span key={seg.key} className="inline-flex items-center gap-1.5 text-[11px] text-paper/70">
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
          background={<MariBankCard className="absolute inset-0 w-full h-full opacity-[0.14] dark:opacity-20 pointer-events-none" />}
        />
      </div>

      {/* Savings buckets — separate, all counted */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-medium text-ink">Savings</h2>
          <span className="text-xs text-ink-muted font-mono">{formatCurrency(savings.total)} total</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {buckets.map((b) => {
            const pct = savings.total > 0 ? `${Math.round((b.value / savings.total) * 100)}% of savings` : 'Counted as savings';

            // EF & GS — the full GoTyme VISA card artwork as a low-opacity background.
            // `meet` fits the whole card design inside (nothing cropped); a faint
            // cyan wash fills the letterbox so the card reads as one surface.
            if (b.key === 'ef' || b.key === 'gs') {
              return (
                <div key={b.key} className="relative bg-paper rounded-xl border border-rule p-5 overflow-hidden min-h-[132px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-paper-lift hover:border-ink/20">
                  <div className="absolute inset-0 bg-[#2ec4c9]/[0.06] pointer-events-none" />
                  <GoTymeCard className="absolute inset-0 w-full h-full opacity-[0.16] dark:opacity-25 pointer-events-none" />
                  <div className="relative">
                    <p className="text-xs font-medium text-ink-muted leading-tight mb-3">{b.label}</p>
                    <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(b.value)}</p>
                    <p className="text-[11px] text-ink-muted mt-1.5">{pct}</p>
                  </div>
                </div>
              );
            }

            // MP2 — the full Pag-IBIG MP2 logo replaces the corner icon, at full size.
            if (b.key === 'mp2') {
              return (
                <div key={b.key} className="bg-paper rounded-xl border border-rule p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-paper-lift hover:border-ink/20">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-xs font-medium text-ink-muted leading-tight pt-0.5">{b.label}</p>
                    <Mp2Logo className="h-12 w-auto shrink-0 rounded-lg" />
                  </div>
                  <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(b.value)}</p>
                  <p className="text-[11px] text-ink-muted mt-1.5">{pct}</p>
                </div>
              );
            }

            return (
              <div key={b.key} className="bg-paper rounded-xl border border-rule p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-paper-lift hover:border-ink/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-ink-muted leading-tight">{b.label}</p>
                  <span className={`${toneClasses[b.tone]} w-7 h-7 rounded-md flex items-center justify-center shrink-0`}>
                    {b.icon}
                  </span>
                </div>
                <p className="num text-2xl font-semibold tracking-tight text-ink">{formatCurrency(b.value)}</p>
                <p className="text-[11px] text-ink-muted mt-1.5">{pct}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-ink-muted mt-3 leading-relaxed">
          Emergency Fund and General Savings include both what you set aside from paychecks and any you logged as expenses.
          Pag-IBIG MP2 counts the contributions you tagged as MP2. All three are savings — money you own, not money spent.
        </p>
      </div>
    </div>
  );
};
