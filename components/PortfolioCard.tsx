import React, { useState, useEffect } from 'react';
import { loadPortfolio } from '../lib/portfolioUtils';
import { Portfolio } from '../types';
import { Briefcase, DollarSign, Target, Edit, Calendar, TrendingUp } from 'lucide-react';

interface PortfolioCardProps {
  onEdit?: () => void;
  refreshTrigger?: number;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ onEdit, refreshTrigger }) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      const result = await loadPortfolio();
      if (result.ok && result.data) {
        setPortfolio(result.data);
      } else {
        setPortfolio(null);
      }
      setLoading(false);
    };
    fetchPortfolio();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-paper rounded-xl border border-rule p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-ink/15 border-t-ink rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!portfolio || (!portfolio.company_name && !portfolio.position && !portfolio.dreams)) {
    return (
      <div className="bg-paper rounded-xl border-2 border-dashed border-rule p-10 text-center">
        <div className="max-w-md mx-auto">
          <div className="h-12 w-12 rounded-full bg-paper-soft flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6 text-ink-muted" />
          </div>
          <h3 className="text-base font-medium text-ink mb-1">No portfolio yet</h3>
          <p className="text-sm text-ink-muted mb-4">
            Add your career details and 5-year goals to populate this section.
          </p>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink hover:bg-ink-soft text-paper text-sm font-medium transition-colors"
            >
              <Edit className="w-4 h-4" />
              Create portfolio
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Professional Information Card */}
      <div className="bg-paper rounded-xl border border-rule overflow-hidden">
        <div className="p-5 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-ink-soft" />
            </div>
            <div>
              <h2 className="text-base font-medium text-ink">Professional portfolio</h2>
              <p className="text-xs text-ink-muted">Career &amp; compensation</p>
            </div>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-paper hover:bg-paper-soft border border-rule text-ink text-sm transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {portfolio.company_name && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  Company
                </div>
                <div className="text-base font-medium text-ink">{portfolio.company_name}</div>
              </div>
            )}

            {portfolio.position && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Position
                </div>
                <div className="text-base font-medium text-ink">{portfolio.position}</div>
              </div>
            )}

            {(portfolio.hourly_rate > 0 || portfolio.monthly_rate > 0) && (
              <div className="md:col-span-2 mt-2 p-4 bg-jade-50/60 rounded-lg border border-jade-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-jade-700">
                    <DollarSign className="w-3.5 h-3.5" />
                    Compensation
                  </div>
                  <div className="text-xs text-ink-soft bg-paper px-2 py-0.5 rounded-md border border-rule">
                    {portfolio.hours_per_day || 8}h/day
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {portfolio.rate_type === 'monthly' && portfolio.monthly_rate > 0 && (
                    <>
                      <div>
                        <div className="text-xs text-ink-muted mb-1">Monthly</div>
                        <div className="num text-xl font-semibold text-jade-700">
                          ₱{portfolio.monthly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-muted mb-1">Daily</div>
                        <div className="num text-xl font-semibold text-ink">
                          ₱{(portfolio.monthly_rate / 22.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">÷ 22.5 days</div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-muted mb-1">Hourly</div>
                        <div className="num text-xl font-semibold text-ink">
                          ₱{(portfolio.monthly_rate / 22.5 / (portfolio.hours_per_day || 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">÷ {portfolio.hours_per_day || 8} hours</div>
                      </div>
                    </>
                  )}
                  {portfolio.rate_type === 'hourly' && portfolio.hourly_rate > 0 && (
                    <>
                      <div>
                        <div className="text-xs text-ink-muted mb-1">Hourly</div>
                        <div className="num text-xl font-semibold text-jade-700">
                          ₱{portfolio.hourly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-muted mb-1">Daily</div>
                        <div className="num text-xl font-semibold text-ink">
                          ₱{(portfolio.hourly_rate * (portfolio.hours_per_day || 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">× {portfolio.hours_per_day || 8} hours</div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-muted mb-1">Monthly est.</div>
                        <div className="num text-xl font-semibold text-ink">
                          ₱{(portfolio.hourly_rate * (portfolio.hours_per_day || 8) * 22.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-ink-muted mt-0.5">× 22.5 days</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dreams & Goals Card */}
      {portfolio.dreams && (
        <div className="bg-paper rounded-xl border border-rule overflow-hidden">
          <div className="p-5 border-b border-rule flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center">
              <Target className="w-5 h-5 text-ink-soft" />
            </div>
            <div>
              <h3 className="text-base font-medium text-ink">5-year vision</h3>
              <p className="text-xs text-ink-muted">Goals &amp; aspirations</p>
            </div>
          </div>

          <div className="p-5">
            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{portfolio.dreams}</p>
          </div>

          {portfolio.updated_at && (
            <div className="px-5 pb-4 flex items-center gap-1.5 text-xs text-ink-muted">
              <Calendar className="w-3.5 h-3.5" />
              Last updated {new Date(portfolio.updated_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioCard;
