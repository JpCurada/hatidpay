import React from 'react';

interface RetroCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function RetroCard({ children, className = '', ...props }: RetroCardProps) {
  return (
    <div className={`retro-card ${className}`} {...props}>
      {children}
    </div>
  );
}
