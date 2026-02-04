import React, { useState, useEffect } from 'react';
import { loadPortfolio } from '../lib/portfolioUtils';
import { Portfolio } from '../types';
import { Briefcase, DollarSign, Target, Edit, Calendar, TrendingUp } from 'lucide-react';

const LOGO_URL = '/logo.png';

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!portfolio || (!portfolio.company_name && !portfolio.position && !portfolio.dreams)) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Portfolio Yet</h3>
          <p className="text-sm text-slate-600 mb-4">
            Create your professional portfolio to showcase your career information and goals.
          </p>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              <Edit className="w-4 h-4" />
              Create Portfolio
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Information Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-white/20 border-2 border-white flex items-center justify-center backdrop-blur-sm">
                <Briefcase className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Professional Portfolio</h2>
                <p className="text-blue-100 text-sm">Career & Employment Details</p>
              </div>
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm transition-all"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          <img 
            src={LOGO_URL} 
            className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 pointer-events-none" 
            alt="Watermark" 
          />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            {portfolio.company_name && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  <Briefcase className="w-4 h-4" />
                  Company
                </div>
                <div className="text-xl font-bold text-slate-800">{portfolio.company_name}</div>
              </div>
            )}

            {/* Position */}
            {portfolio.position && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4" />
                  Position
                </div>
                <div className="text-xl font-bold text-slate-800">{portfolio.position}</div>
              </div>
            )}

            {/* Rate Information */}
            {(portfolio.hourly_rate > 0 || portfolio.monthly_rate > 0) && (
              <div className="md:col-span-2 mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 uppercase tracking-wide">
                    <DollarSign className="w-4 h-4" />
                    Compensation
                  </div>
                  <div className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-emerald-200">
                    {portfolio.hours_per_day || 8}h/day
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {portfolio.rate_type === 'monthly' && portfolio.monthly_rate > 0 && (
                    <>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Monthly Rate</div>
                        <div className="text-2xl font-bold text-emerald-600">
                          ₱{portfolio.monthly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Daily Rate</div>
                        <div className="text-2xl font-bold text-slate-700">
                          ₱{(portfolio.monthly_rate / 22.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">÷ 22.5 days</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Hourly Rate</div>
                        <div className="text-2xl font-bold text-slate-700">
                          ₱{(portfolio.monthly_rate / 22.5 / (portfolio.hours_per_day || 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">÷ {portfolio.hours_per_day || 8} hours</div>
                      </div>
                    </>
                  )}
                  {portfolio.rate_type === 'hourly' && portfolio.hourly_rate > 0 && (
                    <>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Hourly Rate</div>
                        <div className="text-2xl font-bold text-emerald-600">
                          ₱{portfolio.hourly_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Daily Rate</div>
                        <div className="text-2xl font-bold text-slate-700">
                          ₱{(portfolio.hourly_rate * (portfolio.hours_per_day || 8)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">× {portfolio.hours_per_day || 8} hours</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Monthly Estimate</div>
                        <div className="text-2xl font-bold text-slate-700">
                          ₱{(portfolio.hourly_rate * (portfolio.hours_per_day || 8) * 22.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">× 22.5 days</div>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 border-2 border-white flex items-center justify-center backdrop-blur-sm">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">5-Year Vision</h3>
                <p className="text-purple-100 text-sm">Goals & Dreams</p>
              </div>
            </div>
            <img 
              src={LOGO_URL} 
              className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 pointer-events-none" 
              alt="Watermark" 
            />
          </div>

          <div className="p-6">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{portfolio.dreams}</p>
            </div>
          </div>

          {portfolio.updated_at && (
            <div className="px-6 pb-4 flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              Last updated: {new Date(portfolio.updated_at).toLocaleDateString('en-US', { 
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
