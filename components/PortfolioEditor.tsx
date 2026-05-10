import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { loadPortfolio, savePortfolio } from '../lib/portfolioUtils';
import { Portfolio } from '../types';
import { Briefcase, DollarSign, Target, Save, Loader2, CheckCircle, AlertCircle, User as UserIcon } from 'lucide-react';

interface PortfolioEditorProps {
  user: User;
}

export const PortfolioEditor: React.FC<PortfolioEditorProps> = ({ user }) => {
  const [portfolio, setPortfolio] = useState<Portfolio>({
    company_name: '',
    position: '',
    rate_type: 'hourly',
    hourly_rate: 0,
    monthly_rate: 0,
    hours_per_day: 8,
    dreams: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setInitialLoading(true);
      const result = await loadPortfolio();
      if (result.ok && result.data) {
        setPortfolio(result.data);
      }
      setInitialLoading(false);
    };
    fetchPortfolio();
  }, []);

  const handleRateTypeChange = (type: 'hourly' | 'monthly') => {
    setPortfolio(prev => ({ ...prev, rate_type: type }));
  };

  const handleRateChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (portfolio.rate_type === 'hourly') {
      setPortfolio(prev => ({ ...prev, hourly_rate: numValue, monthly_rate: numValue * 8 * 22.5 }));
    } else {
      setPortfolio(prev => ({ ...prev, monthly_rate: numValue, hourly_rate: numValue / 22.5 / 8 }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await savePortfolio(portfolio);
      if (result.ok) {
        setMessage({ type: 'success', text: 'Portfolio saved.' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-ink/15 border-t-ink rounded-full animate-spin"></div>
          <p className="text-sm text-ink-muted">Loading portfolio…</p>
        </div>
      </div>
    );
  }

  const labelClass = "text-xs font-medium text-ink-soft mb-1 block";
  const inputClass = "w-full px-3 py-2.5 bg-paper border border-rule rounded-lg focus:border-ink/30 focus:ring-2 focus:ring-ink/5 outline-none text-sm text-ink placeholder:text-ink-whisper transition-all";

  const sectionHeader = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div className="p-5 border-b border-rule flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-up">
      <div className="bg-paper rounded-xl border border-rule p-5 sm:p-6">
        <h1 className="font-display text-2xl text-ink tracking-tight">Portfolio &amp; career</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your professional information and goals.</p>
      </div>

      {message && (
        <div
          className={`px-3 py-2.5 rounded-lg text-sm flex items-start gap-2 ${
            message.type === 'error'
              ? 'bg-coral-50 text-coral-700 border border-coral-100 dark:bg-coral-500/10 dark:text-coral-400 dark:border-coral-500/30'
              : 'bg-jade-50 text-jade-700 border border-jade-100 dark:bg-jade-900/40 dark:text-jade-300 dark:border-jade-800'
          }`}
        >
          {message.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-paper rounded-xl border border-rule overflow-hidden">
          {sectionHeader(<Briefcase className="w-5 h-5 text-ink-soft" />, 'Company & position', 'Current employment details')}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company-name" className={labelClass}>Company name</label>
              <input
                id="company-name"
                type="text"
                value={portfolio.company_name}
                onChange={(e) => setPortfolio(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="e.g., Tech Corp Inc."
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="position" className={labelClass}>Position</label>
              <input
                id="position"
                type="text"
                value={portfolio.position}
                onChange={(e) => setPortfolio(prev => ({ ...prev, position: e.target.value }))}
                placeholder="e.g., Senior Developer"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-xl border border-rule overflow-hidden">
          {sectionHeader(<DollarSign className="w-5 h-5 text-ink-soft" />, 'Compensation', 'Your rate information')}
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Rate type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRateTypeChange('hourly')}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    portfolio.rate_type === 'hourly'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-paper text-ink hover:bg-paper-soft'
                  }`}
                >
                  Hourly
                </button>
                <button
                  type="button"
                  onClick={() => handleRateTypeChange('monthly')}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    portfolio.rate_type === 'monthly'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-paper text-ink hover:bg-paper-soft'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="rate-amount" className={labelClass}>
                {portfolio.rate_type === 'hourly' ? 'Hourly rate' : 'Monthly rate'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-mono">₱</span>
                <input
                  id="rate-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={portfolio.rate_type === 'hourly' ? portfolio.hourly_rate : portfolio.monthly_rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-7 num`}
                />
              </div>

              <div className="mt-3 p-3 bg-paper-soft/70 rounded-lg border border-rule">
                <p className="text-xs font-medium text-ink-soft mb-1.5">Auto-calculated</p>
                {portfolio.rate_type === 'monthly' && portfolio.monthly_rate > 0 && (
                  <div className="space-y-1 text-xs text-ink-muted">
                    <div className="flex justify-between">
                      <span>Daily rate (÷ 22.5 days)</span>
                      <span className="num font-medium text-ink">₱{(portfolio.monthly_rate / 22.5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hourly rate (÷ 22.5 ÷ 8)</span>
                      <span className="num font-medium text-ink">₱{(portfolio.monthly_rate / 22.5 / 8).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {portfolio.rate_type === 'hourly' && portfolio.hourly_rate > 0 && (
                  <div className="space-y-1 text-xs text-ink-muted">
                    <div className="flex justify-between">
                      <span>Daily rate (× 8 hrs)</span>
                      <span className="num font-medium text-ink">₱{(portfolio.hourly_rate * 8).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly est. (× 8 × 22.5)</span>
                      <span className="num font-medium text-ink">₱{(portfolio.hourly_rate * 8 * 22.5).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {((portfolio.rate_type === 'hourly' && portfolio.hourly_rate === 0) ||
                  (portfolio.rate_type === 'monthly' && portfolio.monthly_rate === 0)) && (
                  <p className="text-xs text-ink-whisper">Enter a rate to see calculations.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-xl border border-rule overflow-hidden">
          {sectionHeader(<Target className="w-5 h-5 text-ink-soft" />, '5-year goals', 'Your aspirations and vision')}
          <div className="p-5">
            <label htmlFor="dreams" className={labelClass}>Where do you see yourself in 5 years?</label>
            <textarea
              id="dreams"
              value={portfolio.dreams}
              onChange={(e) => setPortfolio(prev => ({ ...prev, dreams: e.target.value }))}
              placeholder="Career goals, skills, lifestyle, achievements…"
              rows={8}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-ink-muted mt-1.5">
              Be specific — career progression, skills, lifestyle.
            </p>
          </div>
        </div>

        <div className="sticky bottom-4 z-10">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-paper-lift"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save portfolio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PortfolioEditor;
