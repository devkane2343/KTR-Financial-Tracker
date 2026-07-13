import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    setIsVisible(false);
    setTimeout(onAccept, 200);
  };

  const items: { title: string; body: React.ReactNode }[] = [
    {
      title: 'Collection of personal data',
      body: 'We collect personal and financial information you voluntarily provide — name, income, savings, expenses — to help you track and analyze your finances.',
    },
    {
      title: 'Use of data',
      body: 'Your data is used solely for budgeting analytics, app improvements, and personalized insights to help you manage your finances better.',
    },
    {
      title: 'Data protection',
      body: (
        <>
          All data is processed and stored securely under the <strong className="text-ink">Data Privacy Act of 2012 (RA 10173)</strong>, with safeguards against unauthorized access or disclosure.
        </>
      ),
    },
    {
      title: 'User rights',
      body: 'You have the right to access, correct, or delete your personal data, withdraw consent, and file a complaint with the NPC.',
    },
    {
      title: 'Third-party services',
      body: 'If we use third-party analytics or integrations, your information is shared only when necessary and with partners who meet equivalent privacy standards.',
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-ink/40 backdrop-blur-sm' : 'bg-ink/0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleAccept();
      }}
    >
      <div
        className={`bg-paper rounded-xl border border-rule shadow-paper-lift w-full max-w-xl max-h-[90vh] overflow-hidden transition-all duration-300 transform ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="p-5 sm:p-6 border-b border-rule flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-paper-soft border border-rule flex items-center justify-center">
            <Shield className="w-5 h-5 text-ink-soft" />
          </div>
          <div>
            <h2 className="text-base font-medium text-ink">Privacy notice</h2>
            <p className="text-xs text-ink-muted">Welcome to Fintech</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <p className="text-sm text-ink-soft leading-relaxed mb-4">
            Before continuing, please take a moment to read our privacy notice. By using this app you acknowledge:
          </p>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 p-3 rounded-lg border border-rule bg-paper-soft/40">
                <div className="shrink-0">
                  <div className="w-6 h-6 rounded-full bg-ink/5 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-ink-soft" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-ink text-sm mb-0.5">{item.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-paper-soft border border-rule rounded-lg">
            <p className="text-xs text-ink-soft leading-relaxed">
              By clicking <strong className="text-ink">"I Agree"</strong>, you confirm that you have read, understood, and consented to this notice and the <strong className="text-ink">Data Privacy Act of 2012 (RA 10173)</strong>.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-paper-soft/60 border-t border-rule">
          <button
            onClick={handleAccept}
            className="w-full bg-ink hover:bg-ink-soft text-paper px-6 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            I agree &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
};
