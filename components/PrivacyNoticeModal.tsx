import React, { useEffect, useState } from 'react';
import { X, Shield, CheckCircle } from 'lucide-react';

const LOGO_URL = '/logo.png';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    setIsVisible(false);
    setTimeout(onAccept, 200); // Wait for animation
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={(e) => {
        // Close only if clicking the backdrop
        if (e.target === e.currentTarget) {
          handleAccept();
        }
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden transition-all duration-300 transform ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 opacity-10">
            <img src={LOGO_URL} alt="" className="w-full h-full object-contain rotate-12" />
          </div>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Privacy Notice</h2>
                <p className="text-red-100 text-sm sm:text-base mt-1">Welcome to KTR - Financial Tracker</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-280px)] sm:max-h-[calc(90vh-240px)]">
          <div className="prose prose-sm sm:prose max-w-none">
            <p className="text-slate-700 leading-relaxed mb-4">
              Before continuing, please take a moment to read our privacy notice.
            </p>

            <p className="text-slate-800 font-semibold mb-3">
              By using this app, you acknowledge and agree that:
            </p>

            <div className="space-y-4">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-1">Collection of Personal Data</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    We may collect necessary personal and financial information such as your name, income, savings, 
                    expenses, and other details you voluntarily provide to help track and analyze your finances.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-1">Use of Data</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    Your data will be used solely for legitimate and lawful purposes, including budgeting analytics, 
                    app improvements, and providing personalized insights to help you manage your finances better.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-1">Data Protection</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    All personal data is processed and stored securely in accordance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>. 
                    We implement appropriate security measures to prevent unauthorized access, disclosure, alteration, or destruction of your information.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-1">User Rights</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    You have the right to access, correct, or delete your personal data, withdraw consent, and file a complaint 
                    with the National Privacy Commission (NPC) if you believe your rights have been violated.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-1">Third-Party Services</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    If we use third-party analytics or integrations, your information will only be shared when necessary 
                    and with partners who comply with equivalent privacy standards.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                By clicking <strong>"I Agree"</strong>, you confirm that you have read, understood, and consent to the collection 
                and processing of your personal data in accordance with this Privacy Notice and the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={handleAccept}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 sm:py-3.5 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
