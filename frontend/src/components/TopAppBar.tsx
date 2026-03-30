
interface TopAppBarProps {
  wallet: string | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onConnect: () => void;
}

const navItems = [
  { id: 'DASHBOARD', label: 'Home' },
  { id: 'CREATE', label: 'Escrow' },
  { id: 'HISTORY', label: 'History' },
];

export function TopAppBar({ wallet, currentView, onNavigate, onConnect }: TopAppBarProps) {
  return (
    <header
      id="top-app-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--topbar-height)',
        background: 'var(--bg)',
        borderBottom: 'var(--border-thick)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
      }}
    >
      {/* Brand */}
      <button
        onClick={() => onNavigate('DASHBOARD')}
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
          fontWeight: 700,
          fontStyle: 'italic',
          letterSpacing: '-0.04em',
          color: 'var(--text-main)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
        }}
      >
        HatidPay
      </button>

      {/* Desktop Nav */}
      <nav
        style={{
          display: 'none',
          gap: '0.25rem',
        }}
        className="desktop-nav"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id.toLowerCase()}`}
            onClick={() => onNavigate(item.id)}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.8125rem',
              fontWeight: currentView === item.id ? 700 : 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0.5rem 1rem',
              background: currentView === item.id ? 'var(--text-main)' : 'transparent',
              color: currentView === item.id ? 'var(--bg)' : 'var(--text-main)',
              border: currentView === item.id ? '3px solid var(--text-main)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Action Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Wallet Status */}
        {wallet ? (
          <div
            id="wallet-status"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '0.5rem 0.875rem',
              background: 'var(--text-main)',
              color: 'var(--accent-yellow)',
              border: '3px solid var(--text-main)',
            }}
          >
            {wallet.slice(0, 4)}…{wallet.slice(-4)}
          </div>
        ) : (
          <button
            id="connect-wallet-btn"
            onClick={onConnect}
            className="btn-neo btn-primary btn-sm"
          >
            Connect
          </button>
        )}
      </div>

      {/* Responsive style injection */}
      <style>{`
        .desktop-nav {
          display: none !important;
        }
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
