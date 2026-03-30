import React from 'react';

interface BottomNavBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const tabs = [
  { id: 'DASHBOARD', label: 'Home', icon: 'dashboard' },
  { id: 'CREATE', label: 'Escrow', icon: 'security' },
  { id: 'HISTORY', label: 'History', icon: 'receipt_long' },
];

export function BottomNavBar({ currentView, onNavigate }: BottomNavBarProps) {
  return (
    <>
      <nav
        id="bottom-nav-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'var(--bottombar-height)',
          background: 'var(--bg-white)',
          borderTop: 'var(--border-thick)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {tabs.map((tab) => {
          const isActive = currentView === tab.id || 
            (tab.id === 'DASHBOARD' && currentView === 'CONNECT');
          return (
            <button
              key={tab.id}
              id={`bnav-${tab.id.toLowerCase()}`}
              onClick={() => onNavigate(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                background: isActive ? 'var(--accent-yellow)' : 'transparent',
                borderRight: tab.id !== 'HISTORY' ? '2px solid var(--text-main)' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                padding: '0.5rem',
              }}
            >
              <span
                className="material-icons-outlined"
                style={{
                  fontSize: '22px',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {tab.icon}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.625rem',
                  fontWeight: isActive ? 700 : 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Hide on desktop > 768px */}
      <style>{`
        @media (min-width: 768px) {
          #bottom-nav-bar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
