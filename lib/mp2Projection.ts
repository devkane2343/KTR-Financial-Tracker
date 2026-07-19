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
