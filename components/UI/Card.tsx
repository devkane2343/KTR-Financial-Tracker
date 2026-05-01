
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, eyebrow, className = "" }) => {
  return (
    <div className={`relative bg-paper rounded-2xl shadow-paper overflow-hidden ${className}`}>
      {(title || eyebrow) && (
        <div className="px-6 pt-6 pb-4 border-b border-rule">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          {title && <h3 className="font-display text-2xl text-ink leading-tight">{title}</h3>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
