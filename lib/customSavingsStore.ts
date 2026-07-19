import { supabase } from './supabase';

/**
 * Custom, user-created savings accounts shown on the Net Worth tab. Each row is
 * its own savings card with an independent balance, a per-card liquidity flag,
 * and an optional background image kept in the `card-backgrounds` Storage bucket
 * (the row stores only the object PATH; the public URL is resolved at read time).
 *
 * RLS scopes every query to the signed-in user, so reads never pass a user_id.
 * See supabase/custom_savings_accounts_migration.sql + card_backgrounds_storage.sql.
 *
 * Everything degrades gracefully: if the table or bucket doesn't exist yet,
 * loads return [] and image upload fails non-fatally (the card still saves).
 */

const BUCKET = 'card-backgrounds';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export type Liquidity = 'liquid' | 'nonliquid';

/**
 * A card is either a plain savings pot ('savings') or a market-value
 * investment / insurance like a VUL ('investment'). For an investment card
 * `balance` means the CURRENT FUND VALUE and `contributedValue` is what was paid
 * in; growth = balance − contributedValue.
 */
export type AccountType = 'savings' | 'investment';

/**
 * Which premium months are PAID, per year: year string → sorted month numbers
 * (1..12). e.g. { "2026": [1, 2, 3] } = Jan/Feb/Mar 2026 paid. Used by investment
 * cards to track a recurring (e.g. monthly) premium across the year.
 */
export type PaidMonths = Record<string, number[]>;

export interface CustomSavingsAccount {
  id: string;
  name: string;
  /** For an investment card this is the current fund value. */
  balance: number;
  liquidity: Liquidity;
  accountType: AccountType;
  /** Total paid in (cost basis). 0 for plain savings cards. */
  contributedValue: number;
  /** Free-text provider label for investment cards, e.g. "Prulife". */
  provider: string | null;
  /** Paid premium months per year (investment cards). Empty object if none. */
  paidMonths: PaidMonths;
  backgroundPath: string | null; // storage object path, e.g. "{uid}/{id}.png"
  backgroundUrl: string | null;  // resolved public URL, for rendering
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Ok = { ok: true } | { ok: false; error: string };

/** Columns read back for a card. Kept in one place so load + create stay in sync. */
const COLS = 'id, name, balance, liquidity, account_type, contributed_value, provider, paid_months, background_path, updated_at';
/** Pre-investment-migration column set. Used as a fallback so existing cards keep
 *  loading if the investment_accounts migration hasn't been run yet — the new
 *  fields simply default (fromRow treats them as absent). */
const LEGACY_COLS = 'id, name, balance, liquidity, background_path, updated_at';

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);
const normLiquidity = (v: unknown): Liquidity => (v === 'nonliquid' ? 'nonliquid' : 'liquid');
const normAccountType = (v: unknown): AccountType => (v === 'investment' ? 'investment' : 'savings');

/** Coerce arbitrary JSON into a clean PaidMonths: year→sorted unique months 1..12. */
function normPaidMonths(v: unknown): PaidMonths {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: PaidMonths = {};
  for (const [year, months] of Object.entries(v as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(year) || !Array.isArray(months)) continue;
    const clean = Array.from(new Set(
      months.map(Number).filter(m => Number.isInteger(m) && m >= 1 && m <= 12),
    )).sort((a, b) => a - b);
    if (clean.length > 0) out[year] = clean;
  }
  return out;
}

/** Append a cache-busting token so a re-uploaded image (same path) isn't served
 *  stale from the browser/CDN cache. `token` changes whenever the row changes. */
function bust(url: string, token: string | null): string {
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(token)}`;
}

/** DB row → domain object, resolving the public image URL from the stored path. */
function fromRow(r: {
  id: string;
  name: string | null;
  balance: number | string | null;
  liquidity: string | null;
  account_type?: string | null;
  contributed_value?: number | string | null;
  provider?: string | null;
  paid_months?: unknown;
  background_path: string | null;
  updated_at?: string | null;
}): CustomSavingsAccount {
  let backgroundUrl: string | null = null;
  if (r.background_path) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(r.background_path);
    // updated_at (bumped by the DB trigger on every write) busts the cache so a
    // replaced image at the same path shows immediately after reload.
    backgroundUrl = data?.publicUrl ? bust(data.publicUrl, r.updated_at ?? null) : null;
  }
  return {
    id: r.id,
    name: r.name ?? 'Savings',
    balance: Number(r.balance ?? 0),
    liquidity: normLiquidity(r.liquidity),
    accountType: normAccountType(r.account_type),
    contributedValue: Number(r.contributed_value ?? 0),
    provider: r.provider ?? null,
    paidMonths: normPaidMonths(r.paid_months),
    backgroundPath: r.background_path ?? null,
    backgroundUrl,
  };
}

/** Read all of this user's custom savings accounts. Missing table degrades to []. */
export async function loadCustomSavingsAccounts(): Promise<Result<CustomSavingsAccount[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to load your savings cards.' };

  const { data, error } = await supabase
    .from('custom_savings_accounts')
    .select(COLS)
    .order('created_at', { ascending: true });

  if (error) {
    const code = (error as { code?: string }).code;
    const missing = code === 'PGRST205' || /does not exist|schema cache/i.test(error.message);
    if (missing) {
      // Two cases produce a "does not exist" here:
      //   (a) the whole table isn't created yet → truly no cards, return [].
      //   (b) only the NEW investment columns are missing (migration not run) →
      //       existing cards must still load. Retry with the legacy column set;
      //       fromRow defaults account_type/contributed_value/provider.
      const legacy = await supabase
        .from('custom_savings_accounts')
        .select(LEGACY_COLS)
        .order('created_at', { ascending: true });
      if (!legacy.error) return { ok: true, value: (legacy.data ?? []).map(fromRow) };
      // Legacy read also failed the same way → the table itself is absent.
      const lcode = (legacy.error as { code?: string }).code;
      if (lcode === 'PGRST205' || /does not exist|schema cache/i.test(legacy.error.message)) {
        return { ok: true, value: [] };
      }
      return { ok: false, error: legacy.error.message };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, value: (data ?? []).map(fromRow) };
}

/** Create one account; returns it with the DB-generated id. */
export async function createCustomSavingsAccount(
  input: {
    name: string;
    balance: number;
    liquidity: Liquidity;
    accountType?: AccountType;
    contributedValue?: number;
    provider?: string | null;
    paidMonths?: PaidMonths;
  },
): Promise<Result<CustomSavingsAccount>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to save.' };

  const base = {
    user_id: user.id,
    name: (input.name || 'Savings').slice(0, 60),
    balance: clamp(input.balance),
    liquidity: normLiquidity(input.liquidity),
  };
  const full = {
    ...base,
    account_type: normAccountType(input.accountType),
    contributed_value: clamp(input.contributedValue ?? 0),
    provider: input.provider ? input.provider.slice(0, 60) : null,
    paid_months: normPaidMonths(input.paidMonths),
  };

  const { data, error } = await supabase
    .from('custom_savings_accounts')
    .insert(full)
    .select(COLS)
    .single();

  if (error) {
    // Investment columns missing (migration not run): retry as a legacy savings
    // card so basic card creation still works. Investment fields are dropped.
    if (/does not exist|schema cache/i.test(error.message) || (error as { code?: string }).code === 'PGRST205') {
      const legacy = await supabase
        .from('custom_savings_accounts')
        .insert(base)
        .select(LEGACY_COLS)
        .single();
      if (legacy.error) return { ok: false, error: legacy.error.message };
      return { ok: true, value: fromRow(legacy.data) };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, value: fromRow(data) };
}

/** Patch fields on one account. RLS enforces ownership. */
export async function updateCustomSavingsAccount(
  id: string,
  patch: Partial<{
    name: string;
    balance: number;
    liquidity: Liquidity;
    accountType: AccountType;
    contributedValue: number;
    provider: string | null;
    paidMonths: PaidMonths;
  }>,
): Promise<Ok> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to save.' };

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = (patch.name || 'Savings').slice(0, 60);
  if (patch.balance !== undefined) row.balance = clamp(patch.balance);
  if (patch.liquidity !== undefined) row.liquidity = normLiquidity(patch.liquidity);
  if (patch.accountType !== undefined) row.account_type = normAccountType(patch.accountType);
  if (patch.contributedValue !== undefined) row.contributed_value = clamp(patch.contributedValue);
  if (patch.provider !== undefined) row.provider = patch.provider ? patch.provider.slice(0, 60) : null;
  if (patch.paidMonths !== undefined) row.paid_months = normPaidMonths(patch.paidMonths);
  if (Object.keys(row).length === 0) return { ok: true };

  const { error } = await supabase
    .from('custom_savings_accounts')
    .update(row)
    .eq('id', id);

  if (error) {
    // Investment columns missing (migration not run): retry with only the legacy
    // columns so basic edits (name/balance/liquidity) still work.
    if (/does not exist|schema cache/i.test(error.message) || (error as { code?: string }).code === 'PGRST205') {
      const legacyRow: Record<string, unknown> = {};
      if (row.name !== undefined) legacyRow.name = row.name;
      if (row.balance !== undefined) legacyRow.balance = row.balance;
      if (row.liquidity !== undefined) legacyRow.liquidity = row.liquidity;
      if (Object.keys(legacyRow).length === 0) return { ok: true };
      const legacy = await supabase.from('custom_savings_accounts').update(legacyRow).eq('id', id);
      if (legacy.error) return { ok: false, error: legacy.error.message };
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Delete one account, best-effort removing its background image first. */
export async function deleteCustomSavingsAccount(
  id: string,
  backgroundPath: string | null,
): Promise<Ok> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to delete.' };

  if (backgroundPath) {
    // Non-fatal: an orphaned image is harmless if this fails.
    await supabase.storage.from(BUCKET).remove([backgroundPath]);
  }
  const { error } = await supabase.from('custom_savings_accounts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Upload a background image for an account and store its path on the row.
 * Path is `{uid}/{accountId}.{ext}`. Any prior background for this account
 * (possibly under a different extension) is removed first so the bucket doesn't
 * accumulate orphans — mirrors the list-then-remove pattern in profilePicture.ts.
 * Non-fatal by design: if the bucket is missing this returns { ok: false } but
 * the account itself is untouched, so the card stays usable without an image.
 */
export async function uploadCardBackground(
  accountId: string,
  file: File,
): Promise<Result<{ path: string; url: string }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You must be signed in to upload.' };

  if (file.size > MAX_FILE_SIZE) return { ok: false, error: 'File size must be less than 5MB' };
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { ok: false, error: 'File must be JPEG, PNG, WebP, or GIF' };
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${user.id}/${accountId}.${ext}`;

  // Remove any existing background(s) for this account first, so switching image
  // formats (e.g. .png → .jpg) doesn't leave the old object orphaned.
  const { data: existing } = await supabase.storage.from(BUCKET).list(user.id);
  if (existing && existing.length > 0) {
    const stale = existing
      .filter(f => f.name.startsWith(`${accountId}.`))
      .map(f => `${user.id}/${f.name}`)
      .filter(p => p !== path); // the new object is written by the upsert below
    if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale);
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (upErr) return { ok: false, error: upErr.message };

  const { error: rowErr } = await supabase
    .from('custom_savings_accounts')
    .update({ background_path: path })
    .eq('id', accountId);
  if (rowErr) return { ok: false, error: rowErr.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Bust the cache for the immediate in-session render; reloads get their own
  // token from the row's freshly-bumped updated_at (see fromRow).
  const url = bust(data.publicUrl, `${file.size}-${file.lastModified}`);
  return { ok: true, value: { path, url } };
}
