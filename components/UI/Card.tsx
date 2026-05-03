
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, eyebrow, className = "" }) => {
  return (
    <div className={`bg-paper rounded-xl border border-rule overflow-hidden ${className}`}>
      {(title || eyebrow) && (
        <div className="px-5 pt-5 pb-3 border-b border-rule">
          {eyebrow && <p className="text-xs text-ink-muted mb-1">{eyebrow}</p>}
          {title && <h3 className="font-display text-lg text-ink tracking-tight">{title}</h3>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};
