import React from 'react';

type EscrowStatus = 'Created' | 'Funded' | 'Released' | 'Disputed' | 'Expired';

interface StatusBadgeProps {
  status: EscrowStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeClass = (s: EscrowStatus) => {
    switch (s) {
      case 'Created': return 'badge-created';
      case 'Funded': return 'badge-funded';
      case 'Released': return 'badge-confirmed';
      case 'Disputed': return 'badge-disputed';
      case 'Expired': return 'badge-expired';
      default: return 'badge-created';
    }
  };

  const getIcon = (s: EscrowStatus) => {
    switch (s) {
      case 'Created': return 'hourglass_empty';
      case 'Funded': return 'lock';
      case 'Released': return 'check_circle';
      case 'Disputed': return 'warning';
      case 'Expired': return 'history';
      default: return 'info';
    }
  };

  return (
    <div className={`badge ${getBadgeClass(status)}`}>
      <span className="material-icons-outlined" style={{ fontSize: '14px' }}>
        {getIcon(status)}
      </span>
      {status}
    </div>
  );
}
