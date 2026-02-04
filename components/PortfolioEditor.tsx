import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { loadPortfolio, savePortfolio } from '../lib/portfolioUtils';
import { Portfolio } from '../types';
import { Briefcase, DollarSign, Target, Save, Loader2, CheckCircle, AlertCircle, User as UserIcon } from 'lucide-react';

const LOGO_URL = '/logo.png';

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
      setPortfolio(prev => ({ 
        ...prev, 
        hourly_rate: numValue,
        monthly_rate: numValue * 8 * 22.5
      }));
    } else {
      setPortfolio(prev => ({ 
        ...prev, 
        monthly_rate: numValue,
        hourly_rate: numValue / 22.5 / 8
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const result = await savePortfolio(portfolio);
      
      if (result.ok) {
        setMessage({ type: 'success', text: 'Portfolio saved successfully!' });
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Portfolio & Career Editor</h1>
            <p className="text-white/90">Manage your professional information and career goals</p>
          </div>
          <img 
            src={LOGO_URL} 
            className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 pointer-events-none" 
            alt="Watermark" 
          />
        </div>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
            message.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company & Position */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Company & Position</h2>
                <p className="text-sm text-slate-600">Your current employment details</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company-name" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Briefcase className="w-4 h-4" />
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={portfolio.company_name}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="e.g., Tech Corp Inc."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="position" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <UserIcon className="w-4 h-4" />
                  Position / Job Title
                </label>
                <input
                  id="position"
                  type="text"
                  value={portfolio.position}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="e.g., Senior Developer"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rate Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 border-b border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Rate Information</h2>
                <p className="text-sm text-slate-600">Your compensation details</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <DollarSign className="w-4 h-4" />
                Rate Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRateTypeChange('hourly')}
                  className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
                    portfolio.rate_type === 'hourly'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-lg font-bold">Hourly Rate</div>
                  <div className="text-xs mt-1 opacity-75">Per hour worked</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateTypeChange('monthly')}
                  className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
                    portfolio.rate_type === 'monthly'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="text-lg font-bold">Monthly Rate</div>
                  <div className="text-xs mt-1 opacity-75">Per month</div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="rate-amount" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <DollarSign className="w-4 h-4" />
                {portfolio.rate_type === 'hourly' ? 'Hourly Rate Amount' : 'Monthly Rate Amount'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">₱</span>
                <input
                  id="rate-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={portfolio.rate_type === 'hourly' ? portfolio.hourly_rate : portfolio.monthly_rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Conversion Display */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm font-semibold text-slate-700 mb-2">Automatic Calculations:</div>
                {portfolio.rate_type === 'monthly' && portfolio.monthly_rate > 0 && (
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Daily rate (÷ 22.5 days):</span>
                      <span className="font-bold text-emerald-600">₱{(portfolio.monthly_rate / 22.5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hourly rate (÷ 22.5 days ÷ 8 hrs):</span>
                      <span className="font-bold text-emerald-600">₱{(portfolio.monthly_rate / 22.5 / 8).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {portfolio.rate_type === 'hourly' && portfolio.hourly_rate > 0 && (
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Daily rate (× 8 hrs):</span>
                      <span className="font-bold text-emerald-600">₱{(portfolio.hourly_rate * 8).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly estimate (× 8 hrs × 22.5 days):</span>
                      <span className="font-bold text-emerald-600">₱{(portfolio.hourly_rate * 8 * 22.5).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {((portfolio.rate_type === 'hourly' && portfolio.hourly_rate === 0) || 
                  (portfolio.rate_type === 'monthly' && portfolio.monthly_rate === 0)) && (
                  <p className="text-sm text-slate-500 italic">Enter a rate to see automatic calculations</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dreams & Goals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Dreams & 5-Year Goals</h2>
                <p className="text-sm text-slate-600">Your aspirations and future vision</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div>
              <label htmlFor="dreams" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Target className="w-4 h-4" />
                Where do you see yourself in 5 years?
              </label>
              <textarea
                id="dreams"
                value={portfolio.dreams}
                onChange={(e) => setPortfolio(prev => ({ ...prev, dreams: e.target.value }))}
                placeholder="Describe your career goals, personal aspirations, skills you want to develop, positions you want to achieve, or anything you dream of becoming..."
                rows={8}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                💭 Be specific about your goals - career progression, skills, lifestyle, achievements, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 z-10">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-900/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Saving Portfolio...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Save Portfolio & Dreams
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PortfolioEditor;
