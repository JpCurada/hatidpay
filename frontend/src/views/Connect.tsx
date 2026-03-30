import { useState } from 'react';
import { connectToFreighter } from '../lib/freighter';

interface ConnectProps {
  onConnect: (pubKey: string) => void;
}

export function Connect({ onConnect }: ConnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      const pubKey = await connectToFreighter();
      onConnect(pubKey);
    } catch (e: any) {
      setError(e.message || "Failed to connect to Freighter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-slide-up" style={{ justifyContent: 'center' }}>
      <h1 className="text-huge" style={{ marginBottom: '1rem' }}>Hatid<span style={{color: 'var(--accent-blue)'}}>Pay</span></h1>
      
      <p className="text-body" style={{ marginBottom: '4rem', color: 'var(--text-muted)' }}>
        Instant cross-border supplier escrows.<br/>
        No bank delays. No extra fees.
      </p>

      <button
        onClick={handleConnect}
        disabled={loading}
        style={{
          alignSelf: 'flex-start',
          fontSize: '1.5rem',
          fontWeight: 500,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s ease',
          color: 'var(--text-main)'
        }}
      >
        {loading ? 'Connecting...' : 'Connect Wallet →'}
      </button>

      {error && (
        <div style={{ marginTop: '2rem' }}>
          <p className="text-meta" style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>{error}</p>
          <a href="https://freighter.app" target="_blank" rel="noreferrer" className="text-meta" style={{ textDecoration: 'underline' }}>
            Install Freighter Extension
          </a>
        </div>
      )}
    </div>
  );
}
