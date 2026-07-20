/**
 * Pag-IBIG MP2 (Modified Pag-IBIG II) dividend projection math.
 *
 * How MP2 actually works (verified against pagibigfund.gov.ph + secondary
 * sources, Feb 2026):
 *   • Each MP2 account matures in a fixed 5-year term.
 *   • Dividends are credited ONCE per year (year-end), never monthly.
 *   • The dividend base is the AVERAGE MONTHLY BALANCE (AMB) for the year — early
 *     contributions earn for more months than late ones. The standard member-level
 *     approximation is  AMB = openingBalance + (year's contributions / 2), i.e. a
 *     monthly contribution sits, on average, half the year (the "+6M" convention
 *     that every online MP2 calculator uses).
 *   • Two payout modes chosen at enrollment, fixed for the term:
 *       – 'compounded'    : each year's dividend is added to the balance and earns
 *                           dividends the next year (dividend-on-dividend). Whole
 *                           amount withdrawn as a lump sum at maturity.
 *       – 'annual'        : each year's dividend is paid out in cash and the
 *                           principal keeps growing only from contributions
 *                           (effectively simple interest — no compounding).
 *   • Dividends are 100% tax-free.
 *
 * The rate is NOT fixed or guaranteed: Pag-IBIG's board declares it each year
 * (retrospectively, ~Feb of the following year). So a projection can only ASSUME
 * a rate per year — hence the per-year editable rates the UI drives this with.
 */

/** Number of years an MP2 account is locked in before maturity. */
export const MP2_TERM_YEARS = 5;

/** Minimum single MP2 remittance (PHP). */
export const MP2_MIN_CONTRIBUTION = 500;

/**
 * Latest DECLARED MP2 annual dividend rate (2025 = 7.12%, announced Feb 2026).
 * Used to prefill the projection's per-year rate assumption — there is no 2026
 * rate yet (it is declared ~Feb 2027), so the newest known figure is the honest
 * default to project forward with.
 */
export const MP2_LATEST_RATE_PCT = 7.12;

/**
 * Verified historical MP2 annual dividend rates (%), newest first. Shown in the
 * UI as a read-only reference so the user can pick realistic assumptions.
 * Cross-checked across PNA, GMA, BusinessMirror, SweldoPH and mp2 calculator
 * tables; the pandemic dip (2020–21) and the 2017 all-time high are included.
 */
export const MP2_HISTORICAL_RATES: ReadonlyArray<{ year: number; ratePct: number }> = [
  { year: 2025, ratePct: 7.12 },
  { year: 2024, ratePct: 7.10 },
  { year: 2023, ratePct: 7.05 },
  { year: 2022, ratePct: 7.03 },
  { year: 2021, ratePct: 6.00 },
  { year: 2020, ratePct: 6.12 },
  { year: 2019, ratePct: 7.23 },
  { year: 2018, ratePct: 7.41 },
  { year: 2017, ratePct: 8.11 },
];

/** How dividends are handled over the term. */
export type Mp2PayoutMode = 'compounded' | 'annual';

/** Inputs to a projection. All money in PHP. */
export interface Mp2ProjectionInput {
  /** Money already in the account at the start of the projection (opening balance). */
  openingBalance: number;
  /** Fixed contribution added each month during the term. */
  monthlyContribution: number;
  /** Calendar year the projection starts (year 1). */
  startYear: number;
  /**
   * Assumed annual dividend rate (%) per projection year, index 0 = startYear.
   * Length should be MP2_TERM_YEARS; shorter arrays reuse the last entry, an
   * empty array falls back to MP2_LATEST_RATE_PCT.
   */
  ratesPct: number[];
  /** 'compounded' (reinvest, lump sum at maturity) or 'annual' (pay dividends out yearly). */
  mode: Mp2PayoutMode;
}

/** One year of the projection breakdown. */
export interface Mp2YearRow {
  /** Calendar year (startYear, startYear+1, …). */
  year: number;
  /** 1-based year number within the 5-year term. */
  index: number;
  /** Balance carried in at the start of the year. */
  opening: number;
  /** Contributions added this year (monthlyContribution × 12). */
  contributions: number;
  /** Assumed dividend rate applied this year (%). */
  ratePct: number;
  /** Average monthly balance the dividend was computed on (opening + contributions/2). */
  averageBalance: number;
  /** Dividend earned this year (tax-free). */
  dividend: number;
  /**
   * Balance carried out at year end. Under 'compounded' this includes the
   * dividend; under 'annual' the dividend is paid out so it does NOT.
   */
  closing: number;
  /** Running sum of dividends from year 1 through this year. */
  cumulativeDividend: number;
}

export interface Mp2ProjectionResult {
  rows: Mp2YearRow[];
  /** Total of your own money in the account at maturity (opening + all contributions). */
  totalContributed: number;
  /** Sum of all dividends earned across the term (tax-free). */
  totalDividends: number;
  /**
   * Cash in hand at maturity.
   *   compounded → opening + contributions + all reinvested dividends (rows' last closing).
   *   annual     → opening + contributions (principal), with dividends already taken as cash.
   */
  maturityValue: number;
}

/** Clamp to a finite, non-negative number (bad input → 0). */
const clampMoney = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
/** Clamp a percentage into a sane 0–100 band (bad input → 0). */
const clampRate = (n: number): number => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);
/** Round to centavos so displayed figures reconcile. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Resolve the assumed rate (%) for projection year `i` (0-based). Reuses the last
 * supplied rate for years beyond the array, and the latest declared rate when the
 * array is empty — so the projection always has a sensible number to work with.
 */
export function rateForYear(ratesPct: number[], i: number): number {
  if (ratesPct.length === 0) return MP2_LATEST_RATE_PCT;
  const r = i < ratesPct.length ? ratesPct[i] : ratesPct[ratesPct.length - 1];
  return clampRate(r);
}

/**
 * Project an MP2 account year by year over the 5-year term using the average-
 * monthly-balance convention (AMB = opening + yearContributions/2).
 *
 * Per year:
 *   contributions = monthlyContribution × 12
 *   AMB           = opening + contributions/2
 *   dividend      = AMB × rate
 *   closing       = opening + contributions + (mode === 'compounded' ? dividend : 0)
 *
 * The next year opens at this year's closing. Under 'annual' the dividend is
 * removed (paid out), so it never compounds — matching Pag-IBIG's two modes.
 */
export function projectMp2(input: Mp2ProjectionInput): Mp2ProjectionResult {
  const opening0 = clampMoney(input.openingBalance);
  const monthly = clampMoney(input.monthlyContribution);
  const yearContributions = round2(monthly * 12);

  const rows: Mp2YearRow[] = [];
  let opening = opening0;
  let cumulativeDividend = 0;

  for (let i = 0; i < MP2_TERM_YEARS; i++) {
    const ratePct = rateForYear(input.ratesPct, i);
    const r = ratePct / 100;
    const averageBalance = round2(opening + yearContributions / 2);
    const dividend = round2(averageBalance * r);
    cumulativeDividend = round2(cumulativeDividend + dividend);
    const closing = round2(
      opening + yearContributions + (input.mode === 'compounded' ? dividend : 0),
    );
    rows.push({
      year: input.startYear + i,
      index: i + 1,
      opening: round2(opening),
      contributions: yearContributions,
      ratePct,
      averageBalance,
      dividend,
      closing,
      cumulativeDividend,
    });
    opening = closing;
  }

  const totalContributed = round2(opening0 + yearContributions * MP2_TERM_YEARS);
  const totalDividends = cumulativeDividend;
  const maturityValue =
    input.mode === 'compounded'
      ? (rows.length ? rows[rows.length - 1].closing : totalContributed)
      : round2(totalContributed); // dividends already paid out as cash under 'annual'

  return { rows, totalContributed, totalDividends, maturityValue };
}

/** A dated MP2 contribution (positive = money in, negative = withdrawal). */
export interface Mp2ContributionPoint {
  /** YYYY-MM-DD */
  date: string;
  amount: number;
}

/** Paid MP2 months per year, derived from real payments: year → sorted month numbers 1..12. */
export type Mp2PaidMonths = Record<string, number[]>;

/** One calendar month that had MP2 activity, for the payment breakdown list. */
export interface Mp2MonthlyPayment {
  /** 'YYYY-MM' */
  monthKey: string;
  year: number;
  /** 1..12 */
  month: number;
  /** Summed positive contributions that landed in this month (service charge netted out). */
  amount: number;
}

/** What the projection's monthly figure should default to, derived from real data. */
export interface Mp2ContributionSummary {
  /** Average net contribution per active month (INCLUDING any opening lump — the
   *  UI derives a lump-excluded "recurring" figure itself). Kept for reference. */
  suggestedMonthly: number;
  /** Number of distinct calendar months that had any positive contribution. */
  activeMonths: number;
  /** Total positive contributions across the history (service charges netted out). */
  totalIn: number;
  /**
   * Total service charge stripped across all months (raw positive sum − totalIn).
   * Subtract this from the raw MP2 balance to get a fee-clean opening balance that
   * still reflects withdrawals (which this positive-only summary otherwise ignores).
   */
  serviceChargeStripped: number;
  /** True if there's enough history to suggest a monthly figure (≥1 active month). */
  hasHistory: boolean;
  /** Which months were actually paid, per year — auto-fills the months-paid grid. */
  paidMonths: Mp2PaidMonths;
  /** Per-month payment totals (newest-first), for the payment breakdown. */
  monthlyPayments: Mp2MonthlyPayment[];
  /**
   * The biggest single month's contribution — typically the one-time opening
   * lump. Surfaced so the UI can suggest it as the opening balance and keep it
   * out of the recurring-monthly figure.
   */
  largestMonth: Mp2MonthlyPayment | null;
}

/**
 * A small fixed fee (e.g. a ₱14 bank/remittance service charge) rides along with
 * a contribution — the user asked that this trailing charge not be counted as
 * savings, so ₱50,014 reads as a clean ₱50,000.
 *
 * Deliberately conservative so we NEVER mangle a legitimate contribution: we only
 * strip a fee-sized remainder (≤ ₱15 — covers the ₱14) off an otherwise-round
 * hundred, and only on amounts ≥ ₱1,000 (where a small fixed fee plausibly rode
 * along). So ₱50,014 → ₱50,000 and ₱1,014 → ₱1,000, but ₱1,540 / ₱2,530 / ₱1,050
 * (remainder > ₱15) and ₱149 / ₱530 (under ₱1,000) all stay exactly as entered.
 */
const SERVICE_CHARGE_MAX = 15;
export function netServiceCharge(amount: number): number {
  if (!(amount >= 1000)) return amount;                 // only sizeable lumps carry a fee
  const remainder = amount % 100;
  return remainder > 0 && remainder <= SERVICE_CHARGE_MAX ? amount - remainder : amount;
}

/**
 * Reconcile the projection with the user's ACTUAL MP2 contributions so the
 * forecast reflects what they've really paid, not a flat guess.
 *
 * Only positive contributions count (withdrawals don't tell us a saving
 * cadence). Each month's total has any tiny service charge netted out. We derive:
 *   • paidMonths      — which calendar months were actually paid (auto-grid);
 *   • monthlyPayments — per-month totals for the breakdown list;
 *   • largestMonth    — the biggest month (usually the one-time opening lump);
 *   • suggestedMonthly— average net contribution per active month.
 *
 * Falls back to hasHistory=false when there's nothing to go on so the caller can
 * keep a sensible default.
 */
export function summarizeMp2Contributions(points: Mp2ContributionPoint[]): Mp2ContributionSummary {
  const monthly = new Map<string, number>(); // 'YYYY-MM' → summed positive amount
  for (const p of points) {
    if (!(p.amount > 0)) continue;            // skip withdrawals / zero rows
    const key = p.date.slice(0, 7);           // 'YYYY-MM'
    monthly.set(key, (monthly.get(key) ?? 0) + p.amount);
  }

  // Net the service charge per month (after summing, so multiple small same-month
  // payments aren't each mis-stripped). We keep the raw pre-net amount alongside
  // each surviving month so the stripped total counts ONLY months we actually use.
  const withRaw = Array.from(monthly.entries())
    .map(([monthKey, raw]) => {
      const [y, m] = monthKey.split('-').map(Number);
      return { monthKey, year: y, month: m, raw, amount: netServiceCharge(raw) };
    })
    .filter(p => p.amount > 0 && Number.isFinite(p.year) && p.month >= 1 && p.month <= 12)
    .sort((a, b) => (a.monthKey < b.monthKey ? 1 : a.monthKey > b.monthKey ? -1 : 0)); // newest first

  const monthlyPayments: Mp2MonthlyPayment[] = withRaw.map(({ monthKey, year, month, amount }) => ({ monthKey, year, month, amount }));
  const totalIn = monthlyPayments.reduce((s, p) => s + p.amount, 0);
  const serviceChargeStripped = Math.max(0, Math.round(withRaw.reduce((s, p) => s + (p.raw - p.amount), 0) * 100) / 100);
  const activeMonths = monthlyPayments.length;
  const suggestedMonthly = activeMonths > 0 ? Math.round(totalIn / activeMonths) : 0;

  // Auto months-paid grid: every month with a real payment is marked paid.
  const paidMonths: Mp2PaidMonths = {};
  for (const p of monthlyPayments) {
    const yr = String(p.year);
    (paidMonths[yr] ??= []).push(p.month);
  }
  for (const yr of Object.keys(paidMonths)) paidMonths[yr].sort((a, b) => a - b);

  const largestMonth = monthlyPayments.reduce<Mp2MonthlyPayment | null>(
    (best, p) => (best === null || p.amount > best.amount ? p : best),
    null,
  );

  return { suggestedMonthly, activeMonths, totalIn, serviceChargeStripped, hasHistory: activeMonths > 0, paidMonths, monthlyPayments, largestMonth };
}

/** The non-lump months (every month except the biggest, which is treated as the
 *  one-time opening deposit). Shared by the Actual and Projection views. */
export function recurringMp2Months(summary: Mp2ContributionSummary): Mp2MonthlyPayment[] {
  if (!summary.hasHistory) return [];
  return summary.monthlyPayments.filter(p => p.monthKey !== summary.largestMonth?.monthKey);
}

/**
 * A SUGGESTED recurring monthly contribution derived from real history, excluding
 * the one-time opening lump (largest month) so a big initial deposit doesn't
 * inflate it. Only a starting hint — MP2 remittances are ad-hoc, so the monthly
 * stays the user's to set. Averages the non-lump months; if only the lump exists,
 * falls back to the ₱500 minimum.
 */
export function deriveMp2Monthly(summary: Mp2ContributionSummary): number {
  if (!summary.hasHistory) return MP2_MIN_CONTRIBUTION;
  const recurring = recurringMp2Months(summary);
  if (recurring.length > 0) {
    return Math.max(Math.round(recurring.reduce((s, p) => s + p.amount, 0) / recurring.length), 0);
  }
  return MP2_MIN_CONTRIBUTION;
}
