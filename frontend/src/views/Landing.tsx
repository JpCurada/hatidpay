
interface LandingProps {
  onConnect: () => Promise<void>;
  loading: boolean;
}

export function Landing({ onConnect, loading }: LandingProps) {
  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '4rem', padding: '4rem 1.5rem' }}>
      
      {/* Brand Hero */}
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="display-xl" style={{ marginBottom: '1rem' }}>
          Hatid<span style={{ color: 'var(--accent-blue)' }}>Pay</span>
        </h1>
        <p className="text-h2" style={{ color: 'var(--text-main)', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
          Instant cross-border supplier escrows.<br/>Powered by USDC on Stellar.
        </p>
      </header>

      {/* Main CTA */}
      <div style={{ textAlign: 'center' }}>
        <button 
          disabled={loading} 
          onClick={onConnect} 
          className="btn-neo btn-primary"
          style={{ padding: '1.5rem 3rem', fontSize: '1.25rem' }}
        >
          {loading ? 'Connecting...' : 'Connect Freighter Wallet →'}
        </button>
        <p className="text-meta" style={{ marginTop: '1rem', opacity: 0.6 }}>Testnet Connection Required</p>
      </div>

      {/* How it works (Testnet Demo instructions) */}
      <section className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
        
        <div className="card-neo" style={{ borderTop: '8px solid var(--accent-yellow)' }}>
          <span className="display-lg" style={{ fontSize: '2.5rem', opacity: 0.2 }}>01</span>
          <h2 className="text-h2" style={{ marginTop: '1rem' }}>The Wallet</h2>
          <p className="text-body" style={{ marginTop: '1rem' }}>
            Install the <strong>Freighter Wallet</strong> extension. Ensure it is set to the <strong>Testnet</strong> network.
          </p>
        </div>

        <div className="card-neo" style={{ borderTop: '8px solid var(--accent-blue)' }}>
          <span className="display-lg" style={{ fontSize: '2.5rem', opacity: 0.2 }}>02</span>
          <h2 className="text-h2" style={{ marginTop: '1rem' }}>The Assets</h2>
          <p className="text-body" style={{ marginTop: '1rem' }}>
            Requires testnet <strong>XLM</strong> for fees and <strong>USDC</strong> for transactions. No trustline setup needed.
          </p>
        </div>

        <div className="card-neo" style={{ borderTop: '8px solid var(--text-main)' }}>
          <span className="display-lg" style={{ fontSize: '2.5rem', opacity: 0.2 }}>03</span>
          <h2 className="text-h2" style={{ marginTop: '1rem' }}>The Flow</h2>
          <p className="text-body" style={{ marginTop: '1rem' }}>
            Act as a <strong>Buyer</strong>. Lock funds for a <strong>Supplier</strong> address and release once goods arrive.
          </p>
        </div>

      </section>

      {/* Footer Info */}
      <footer className="card-neo-accent" style={{ backgroundColor: 'var(--surface-container)', color: 'var(--text-main)', textAlign: 'center' }}>
         <h4 className="text-h3" style={{ marginBottom: '0.5rem' }}>HatidPay Escrow Protocol v1.0</h4>
         <p className="text-meta" style={{ opacity: 0.7 }}>Securely bridging the gap between Philippine SMEs and Global Suppliers.</p>
      </footer>

    </div>
  );
}
