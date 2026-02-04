import { supabase } from './supabase';
import { Portfolio } from '../types';

/**
 * Load portfolio data for the current user
 */
export async function loadPortfolio(): Promise<{ ok: true; data: Portfolio | null } | { ok: false; error: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no portfolio exists yet, return null (not an error)
      if (error.code === 'PGRST116') {
        return { ok: true, data: null };
      }
      return { ok: false, error: error.message };
    }

    // Convert snake_case to camelCase
    const portfolio: Portfolio = {
      id: data.id,
      user_id: data.user_id,
      company_name: data.company_name || '',
      position: data.position || '',
      rate_type: data.rate_type || 'hourly',
      hourly_rate: parseFloat(data.hourly_rate || '0'),
      monthly_rate: parseFloat(data.monthly_rate || '0'),
      hours_per_day: parseFloat(data.hours_per_day || '8'),
      dreams: data.dreams || '',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { ok: true, data: portfolio };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Save or update portfolio data for the current user
 */
export async function savePortfolio(portfolio: Portfolio): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: 'Not authenticated' };
    }

    // Convert camelCase to snake_case for database
    const dbPortfolio = {
      user_id: user.id,
      company_name: portfolio.company_name,
      position: portfolio.position,
      rate_type: portfolio.rate_type,
      hourly_rate: portfolio.hourly_rate,
      monthly_rate: portfolio.monthly_rate,
      hours_per_day: portfolio.hours_per_day,
      dreams: portfolio.dreams,
    };

    // Upsert (insert or update)
    const { error } = await supabase
      .from('portfolio')
      .upsert(dbPortfolio, {
        onConflict: 'user_id',
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
