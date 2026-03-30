import React, { useState, useEffect, useRef } from 'react';
import { getAnchorConfig, getSep10Token, initiateDeposit, getTransactionStatus } from '../lib/sep24';
import type { DepositStatus } from '../lib/sep24';

// Test anchor asset — testanchor.stellar.org uses "SRT" on testnet
const TEST_ASSET_CODE = 'SRT';

const STATUS_LABEL: Record<DepositStatus, string> = {
  incomplete: 'Waiting for you to complete the form...',
  pending_user_transfer_start: 'Waiting for PHP transfer...',
  pending_anchor: 'Anchor is processing...',
  pending_stellar: 'Settling on Stellar...',
  completed: 'Deposit complete!',
  error: 'Something went wrong.',
};

interface OnRampProps {
  walletAddress: string;
}

export function OnRamp({ walletAddress }: OnRampProps) {
  const [step, setStep] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jwtRef = useRef<string>('');
  const txIdRef = useRef<string>('');
  const sep24EndpointRef = useRef<string>('');

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = () => {
    setStep('polling');
    pollRef.current = setInterval(async () => {
      try {
        const status = await getTransactionStatus(txIdRef.current, sep24EndpointRef.current, jwtRef.current);
        setDepositStatus(status);
        if (status === 'completed' || status === 'error') {
          clearInterval(pollRef.current!);
          setStep(status === 'completed' ? 'done' : 'error');
        }
      } catch {
        // keep polling
      }
    }, 3000);
  };

  const handleDeposit = async () => {
    setStep('loading');
    setErrorMsg('');
    try {
      // 1. Discover anchor endpoints from TOML
      const { webAuthEndpoint, sep24Endpoint } = await getAnchorConfig();
      sep24EndpointRef.current = sep24Endpoint;

      // 2. SEP-10: authenticate and get JWT
      const jwt = await getSep10Token(walletAddress, webAuthEndpoint);
      jwtRef.current = jwt;

      // 3. SEP-24: start interactive deposit
      const { url, id } = await initiateDeposit(walletAddress, TEST_ASSET_CODE, sep24Endpoint, jwt);
      txIdRef.current = id;

      // 4. Open anchor's interactive UI in a popup
      const popup = window.open(url, 'sep24_deposit', 'width=500,height=700');
      if (!popup) throw new Error('Popup was blocked. Please allow popups for this site.');

      // 5. Start polling for status
      setDepositStatus('incomplete');
      startPolling();
    } catch (e: any) {
      setErrorMsg(e.message || 'Deposit failed.');
      setStep('error');
    }
  };

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      {/* Header */}
      <section>
        <span className="text-meta">Funding</span>
        <h1 className="display-lg">Deposit PHP</h1>
        <p className="text-body" style={{ marginTop: '0.5rem', opacity: 0.8 }}>
          Fastest on-ramp for USDC in the Philippines. Zero hidden spreads.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

        {/* Flow Card */}
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Anchor badge */}
          <div className="card-neo-accent" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="material-icons-outlined" style={{ fontSize: '32px' }}>anchor</span>
            <div>
              <p className="text-h3">testanchor.stellar.org</p>
              <p className="text-meta">Stellar Reference Anchor · SEP-24 · Testnet</p>
            </div>
          </div>

          {/* Status area */}
          {step === 'polling' && depositStatus && (
            <div className="card-neo-flat" style={{ borderLeft: '8px solid var(--accent-yellow)', padding: '1rem' }}>
              <p className="text-meta" style={{ marginBottom: '0.25rem' }}>Status</p>
              <p className="text-h3">{STATUS_LABEL[depositStatus]}</p>
              {depositStatus !== 'completed' && depositStatus !== 'error' && (
                <p className="text-meta animate-pulse" style={{ marginTop: '0.5rem' }}>Checking every 3 seconds...</p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="card-neo-flat" style={{ borderLeft: '8px solid #22c55e', padding: '1rem' }}>
              <p className="text-h3" style={{ color: '#22c55e' }}>Deposit complete!</p>
              <p className="text-meta" style={{ marginTop: '0.25rem' }}>Your {TEST_ASSET_CODE} balance has been updated.</p>
            </div>
          )}

          {step === 'error' && (
            <div className="card-neo-flat" style={{ borderLeft: '8px solid #ef4444', padding: '1rem' }}>
              <p className="text-h3" style={{ color: '#ef4444' }}>Error</p>
              <p className="text-meta" style={{ marginTop: '0.25rem' }}>{errorMsg || STATUS_LABEL['error']}</p>
            </div>
          )}

          <button
            className="btn-neo btn-primary btn-full"
            style={{ padding: '1.25rem' }}
            onClick={handleDeposit}
            disabled={step === 'loading' || step === 'polling' || step === 'done'}
          >
            {step === 'loading' ? 'Authenticating...' :
             step === 'polling' ? 'Deposit in progress...' :
             step === 'done'    ? 'Deposit complete ✓' :
             'Initialize Deposit →'}
          </button>

          <p className="text-meta" style={{ opacity: 0.5, textAlign: 'center' }}>
            A secure popup will open from the anchor to complete your PHP transfer.
          </p>
        </div>

        {/* Instructional Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 className="text-h2">How it works</h2>

          {[
            { step: '01', title: 'Authenticate', desc: 'Sign a challenge with your Freighter wallet via SEP-10 to prove ownership.' },
            { step: '02', title: 'Complete Form', desc: 'The anchor opens a secure popup where you enter your PHP payment details.' },
            { step: '03', title: 'Receive Funds', desc: 'Once confirmed, tokens are deposited directly into your Stellar wallet.' },
          ].map((s) => (
            <div key={s.step} className="card-neo-flat" style={{ borderLeft: '8px solid var(--accent-yellow)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span className="display-lg" style={{ fontSize: '2rem', opacity: 0.3 }}>{s.step}</span>
                <div>
                  <h3 className="text-h3">{s.title}</h3>
                  <p className="text-body" style={{ marginTop: '0.25rem' }}>{s.desc}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="card-neo" style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg)', marginTop: '1rem' }}>
            <h4 className="text-h3" style={{ color: 'var(--accent-yellow)' }}>Testnet Demo</h4>
            <p className="text-meta" style={{ marginTop: '0.5rem', color: 'var(--bg)' }}>
              Using testanchor.stellar.org with {TEST_ASSET_CODE} on Stellar testnet. In production this connects to a real Philippine peso anchor.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}
