import React, { useState, useEffect } from 'react';
import { getEscrow, confirmDelivery } from '../lib/stellar';
import type { EscrowData } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/account';

interface EscrowDetailProps {
  escrowId: string;
  walletAddress: string;
  onBack: () => void;
  onDispute: (id: string) => void;
}

function useCountdown(deadline: Date | null) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setIsUrgent(h < 6);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return { timeLeft, isUrgent };
}

export function EscrowDetail({ escrowId, walletAddress, onBack, onDispute }: EscrowDetailProps) {
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const syncEscrowStatus = useMutation(api.escrows.syncEscrow);
  const { timeLeft, isUrgent } = useCountdown(escrow?.deadline ?? null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getEscrow(Number(escrowId), walletAddress);
      setEscrow(data);
    } catch (e: any) {
      setError(e.message || 'Error loading escrow.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [escrowId]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      setError('');
      await confirmDelivery(walletAddress, Number(escrowId));
      if (escrow) {
        await syncEscrowStatus({
          escrowId: Number(escrowId),
          buyerAddress: escrow.buyer,
          supplierAddress: escrow.supplier,
          amountUsd: parseFloat(escrow.amount),
          status: 'Released',
          deadlineAt: Date.now(),
          eventDetails: 'Delivery confirmed. Funds released to supplier.',
        });
      }
      try { await loadData(); } catch {}
    } catch (e: any) {
      setError(e.message || 'Confirmation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !escrow) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <button onClick={onBack} className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Home
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '56px', width: '300px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="skeleton card-neo" style={{ height: '120px' }} />
            <div className="skeleton card-neo" style={{ height: '120px' }} />
          </div>
          <div className="skeleton card-neo" style={{ height: '200px' }} />
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <button onClick={onBack} className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Home
        </button>
        <div className="card-neo" style={{ textAlign: 'center', padding: '3rem' }}>
          <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.3 }}>error_outline</span>
          <p className="text-h2" style={{ marginTop: '1rem' }}>Could not load escrow</p>
          <p className="text-meta" style={{ marginTop: '0.5rem', opacity: 0.6 }}>{error || 'Escrow not found on-chain.'}</p>
          <button onClick={loadData} className="btn-neo btn-secondary" style={{ marginTop: '2rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isBuyer = walletAddress === escrow.buyer;
  const isActive = escrow.status === 'Created';
  const isReleased = escrow.status === 'Confirmed';

  const timelineSteps = [
    { label: 'Created', done: true },
    { label: 'Confirmed / Released', done: isReleased },
    { label: 'Expired', done: escrow.status === 'Expired' },
    { label: 'Disputed', done: escrow.status === 'Disputed', danger: true },
  ];

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* Header */}
      <section>
        <button onClick={onBack} className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
          ← Home
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="text-meta">Contract Status</span>
            <h1 className="display-lg">#HP-{escrow.id}</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <StatusBadge status={isReleased ? 'Released' : escrow.status as any} />
            <button
              onClick={loadData}
              className="text-meta"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)' }}
            >
              <span className="material-icons-outlined" style={{ fontSize: '14px' }}>refresh</span>
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Amount + Countdown */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="card-neo-accent" style={{ backgroundColor: 'var(--text-main)', color: 'white' }}>
          <span className="text-meta" style={{ color: 'white', opacity: 0.7 }}>Locked Volume</span>
          <h2 className="display-lg" style={{ color: 'var(--accent-yellow)', marginTop: '0.5rem' }}>
            {escrow.amount} <span style={{ fontSize: '2rem' }}>USDC</span>
          </h2>
        </div>

        <div className={`card-neo ${isUrgent && isActive ? 'card-neo-accent' : ''}`}
          style={isUrgent && isActive ? { backgroundColor: '#fff0f0', borderColor: 'var(--accent-red)' } : {}}>
          <span className="text-meta">Auto-Release Countdown</span>
          <h2 className={`text-h1 ${isUrgent && isActive ? 'countdown-urgent' : ''}`} style={{ marginTop: '0.5rem', fontVariantNumeric: 'tabular-nums' }}>
            {timeLeft || '—'}
          </h2>
          <p className="text-meta" style={{ marginTop: '0.5rem', opacity: 0.5, fontSize: '10px' }}>
            {escrow.deadline.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </section>

      {/* Buyer Controls */}
      {isBuyer && isActive && (
        <section className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="text-h1">Buyer Controls</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              disabled={actionLoading}
              onClick={handleConfirm}
              className="btn-neo btn-primary"
              style={{ flex: 1, minWidth: '160px', padding: '1.25rem' }}
            >
              {actionLoading ? 'Signing…' : '✓ Confirm Delivery'}
            </button>
            <button
              disabled={actionLoading}
              onClick={() => onDispute(escrowId)}
              className="btn-neo btn-danger"
              style={{ flex: 1, minWidth: '160px', padding: '1.25rem' }}
            >
              Raise Dispute
            </button>
          </div>
          {error && <p className="text-meta" style={{ color: 'var(--accent-red)' }}>{error}</p>}
        </section>
      )}

      {!isBuyer && isActive && (
        <div className="card-neo-flat" style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
          <span className="material-icons-outlined" style={{ fontSize: '32px' }}>hourglass_top</span>
          <p className="text-body" style={{ marginTop: '0.5rem' }}>Waiting for the buyer to confirm delivery.</p>
        </div>
      )}

      {isReleased && (
        <div className="card-neo" style={{ borderColor: '#22c55e', textAlign: 'center', padding: '2rem' }}>
          <span className="material-icons-outlined" style={{ fontSize: '40px', color: '#22c55e' }}>check_circle</span>
          <p className="text-h2" style={{ marginTop: '0.75rem' }}>Funds Released</p>
          <p className="text-meta" style={{ marginTop: '0.5rem', opacity: 0.6 }}>USDC has been sent to the supplier.</p>
        </div>
      )}

      {/* Stakeholders + Timeline */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card-neo">
          <h3 className="text-h2" style={{ marginBottom: '1.5rem' }}>Stakeholders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[{ label: 'Buyer', address: escrow.buyer }, { label: 'Supplier', address: escrow.supplier }].map(({ label, address }) => (
              <div key={label}>
                <span className="text-meta">{label}</span>
                <p className="text-mono" style={{ fontSize: '0.7rem', overflowWrap: 'break-word', marginTop: '0.25rem' }}>{address}</p>
                <a
                  href={`${EXPLORER_BASE}/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.25rem', fontSize: '0.75rem' }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                  Explorer
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="card-neo">
          <h3 className="text-h2" style={{ marginBottom: '1.5rem' }}>Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {timelineSteps.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: step.done ? 1 : 0.3 }}>
                <div style={{
                  width: '14px', height: '14px', flexShrink: 0,
                  background: step.done ? (step.danger ? 'var(--accent-red)' : 'var(--accent-yellow)') : 'transparent',
                  border: `3px solid ${step.done ? (step.danger ? 'var(--accent-red)' : 'var(--text-main)') : 'var(--text-main)'}`,
                }} />
                <span className="text-body" style={{ fontWeight: step.done ? 600 : 400 }}>{step.label}</span>
                {step.done && i === timelineSteps.findLastIndex(s => s.done) && (
                  <span className="text-meta" style={{ marginLeft: 'auto', color: step.danger ? 'var(--accent-red)' : 'var(--accent-blue)' }}>
                    ← Current
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
