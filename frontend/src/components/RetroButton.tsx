import React from 'react';

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export function RetroButton({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}: RetroButtonProps) {
  
  const baseClasses = `retro-btn ${variant}`;
  const widthClass = fullWidth ? 'full-width' : '';
  const disableClass = disabled ? 'disabled' : '';
  
  return (
    <button 
      className={`${baseClasses} ${widthClass} ${disableClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
