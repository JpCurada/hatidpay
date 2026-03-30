import React, { useState, useEffect } from 'react';
import { getEscrow, confirmDelivery } from '../lib/stellar';
import type { EscrowData } from '../types';
import { StatusBadge } from '../components/StatusBadge';

// Convex Hooks
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface EscrowDetailProps {
  escrowId: string;
  walletAddress: string;
  onBack: () => void;
  onDispute: (id: string) => void;
}

export function EscrowDetail({ escrowId, walletAddress, onBack, onDispute }: EscrowDetailProps) {
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync with DB
  const syncEscrowStatus = useMutation(api.escrows.syncEscrow);

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

  useEffect(() => {
    loadData();
  }, [escrowId]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      setError('');
      
      // 1. On-Chain Confirmation
      await confirmDelivery(walletAddress, Number(escrowId));
      
      // 2. Database Sync
      if (escrow) {
        await syncEscrowStatus({
          escrowId: Number(escrowId),
          buyerAddress: escrow.buyer,
          supplierAddress: escrow.supplier,
          amountUsd: parseFloat(escrow.amount),
          status: "Released",
          deadlineAt: Date.now(),
          eventDetails: "Delivery confirmed. Funds released to supplier."
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
    return <div className="text-meta animate-pulse">Syncing on-chain state...</div>;
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
  const isCreated = escrow.status === 'Created';

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      <section>
        <button onClick={onBack} className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
          Home
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <span className="text-meta">Contract Status</span>
                <h1 className="display-lg">#HP-{escrow.id}</h1>
            </div>
            <StatusBadge status={escrow.status === 'Confirmed' ? 'Released' : escrow.status} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card-neo-accent" style={{ backgroundColor: 'var(--text-main)', color: 'white' }}>
            <span className="text-meta" style={{ color: 'white', opacity: 0.7 }}>Locked Volume</span>
            <h2 className="display-lg" style={{ color: 'var(--accent-yellow)', marginTop: '0.5rem' }}>
              {escrow.amount} <span style={{ fontSize: '2.5rem' }}>USDC</span>
            </h2>
        </div>
        <div className="card-neo">
            <span className="text-meta">Smart Timer</span>
            <h2 className="text-h1" style={{ marginTop: '0.5rem' }}>72h <span style={{ fontWeight: 400, opacity: 0.6 }}>AUTO-RELEASE</span></h2>
            <p className="text-meta" style={{ marginTop: '1rem', fontSize: '10px' }}>Funds transfer automatically if no dispute is raised.</p>
        </div>
      </section>

      {isBuyer && isCreated && (
        <section className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 className="text-h1">Merchant Controls</h3>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <button 
                  disabled={actionLoading}
                  onClick={handleConfirm}
                  className="btn-neo btn-primary"
                  style={{ flex: 1, padding: '1.5rem' }}
                >
                  {actionLoading ? 'Signing...' : '✓ Confirm Delivery'}
                </button>
                <button 
                  disabled={actionLoading}
                  onClick={() => onDispute(escrowId)}
                  className="btn-neo btn-danger"
                  style={{ flex: 1, padding: '1.5rem' }}
                >
                  Raise Dispute
                </button>
            </div>
            {error && <p className="text-meta" style={{ color: 'var(--accent-red)' }}>{error}</p>}
        </section>
      )}

      {!isBuyer && isCreated && (
          <div className="card-neo-flat" style={{ textAlign: 'center', opacity: 0.6 }}>
             <span className="material-icons-outlined" style={{ fontSize: '32px' }}>hourglass_top</span>
             <p className="text-body" style={{ marginTop: '0.5rem' }}>Waiting for buyer release.</p>
          </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="card-neo">
           <h3 className="text-h2">Stakeholders</h3>
           <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div>
               <span className="text-meta">Buyer</span>
               <p className="text-mono" style={{ fontSize: '0.75rem', overflowWrap: 'break-word' }}>{escrow.buyer}</p>
             </div>
             <div>
               <span className="text-meta">Supplier</span>
               <p className="text-mono" style={{ fontSize: '0.75rem', overflowWrap: 'break-word' }}>{escrow.supplier}</p>
             </div>
           </div>
        </div>
        <div className="card-neo">
           <h3 className="text-h2">Timeline</h3>
           <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <div style={{ width: '12px', height: '12px', background: 'var(--accent-yellow)', border: '2px solid black' }} />
               <span className="text-body">Initialized & Funded</span>
             </div>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: 0.3 }}>
               <div style={{ width: '12px', height: '12px', background: 'white', border: '2px solid black' }} />
               <span className="text-body">Confirmed & Released</span>
             </div>
           </div>
        </div>
      </section>

    </div>
  );
}
