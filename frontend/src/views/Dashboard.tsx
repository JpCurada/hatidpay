import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { getUsdcBalance } from '../lib/stellar';

// Convex Hooks
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface DashboardProps {
  wallet: string;
  userName: string;
  onNavigate: (view: any, escrowId?: string) => void;
}

export function Dashboard({ wallet, userName, onNavigate }: DashboardProps) {
  // Query real data from Convex!
  // These will update instantly when the database changes.
  const escrows = useQuery(api.escrows.listMyEscrows, { userAddress: wallet });
  const activity = useQuery(api.escrows.getMyActivity, { userAddress: wallet, limit: 5 });

  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  useEffect(() => {
    getUsdcBalance(wallet)
      .then(setUsdcBalance)
      .catch(() => setUsdcBalance('—'));
  }, [wallet]);

  // Fallback / Loading State
  const isLoading = escrows === undefined || activity === undefined;

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Page Header */}
      <section>
        <span className="text-meta">Overview</span>
        <h1 className="display-lg">Welcome, {userName}</h1>
      </section>

      {/* Balance Card (Mock for now since balance isn't in DB but in explorer) */}
      <section className="card-neo-accent" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <span className="text-meta" style={{ color: 'var(--text-main)' }}>Total balance</span>
          <h2 className="display-lg" style={{ marginTop: '0.5rem' }}>{usdcBalance ?? '...'} <span className="text-h2" style={{ opacity: 0.7 }}>USDC</span></h2>
        </div>
        <button onClick={() => onNavigate('HISTORY')} className="btn-neo btn-dark">
          View History →
        </button>
      </section>

      {/* Quick Actions */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h3 className="text-h2">Secure Transaction</h3>
            <p className="text-body" style={{ marginTop: '0.5rem' }}>Start a new payment protection agreement with a verified provider.</p>
          </div>
          <button onClick={() => onNavigate('CREATE')} className="btn-neo btn-primary btn-full">
            New Escrow +
          </button>
        </div>
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h3 className="text-h2">Track Shipment</h3>
            <p className="text-body" style={{ marginTop: '0.5rem' }}>Check the real-time status of your cross-border goods.</p>
          </div>
          <button onClick={() => onNavigate('HISTORY')} className="btn-neo btn-secondary btn-full">
             View History
          </button>
        </div>
      </section>

      {/* Active Escrows - Dynamic from DB */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <h2 className="text-h1">Active Escrows</h2>
            {isLoading && <span className="text-meta animate-pulse">Syncing...</span>}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {escrows && escrows.length > 0 ? (
            escrows.map((escrow) => (
              <div 
                key={escrow._id} 
                className="card-neo" 
                onClick={() => onNavigate('DETAIL', escrow.escrowId.toString())}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <StatusBadge status={escrow.status as any} />
                  <h3 className="text-h2" style={{ marginTop: '0.5rem' }}>
                    {escrow.invoiceRef || `Escrow #HP-${escrow.escrowId}`}
                  </h3>
                  <p className="text-meta">Supplier: {escrow.supplierAddress.slice(0, 8)}...</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-meta">Amount</span>
                  <p className="text-h2" style={{ fontWeight: 700 }}>{escrow.amountUsd.toFixed(2)} USDC</p>
                </div>
              </div>
            ))
          ) : !isLoading ? (
            <div className="card-neo-flat" style={{ textAlign: 'center', padding: '3rem', borderStyle: 'dashed' }}>
               <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>lock</span>
               <p className="text-body" style={{ marginTop: '1rem', opacity: 0.5 }}>No active escrows found for this wallet.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Recent Activity - Dynamic from DB */}
      <section>
        <h2 className="text-h1" style={{ marginBottom: '1.5rem' }}>Recent Activity</h2>
        <div className="card-neo-flat" style={{ padding: 0 }}>
          {activity && activity.length > 0 ? (
            activity.map((item, index) => (
              <div key={item._id} style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: index !== activity.length - 1 ? '2px solid var(--text-main)' : 'none'
              }}>
                <div>
                  <h4 className="text-h3">{item.details}</h4>
                  <p className="text-meta">{new Date(item.createdAt).toLocaleString('en-PH', { dateStyle: 'medium' })}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-meta">{item.eventType.replace('_', ' ')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', justifyContent: 'flex-end' }}>
                     <span className="material-icons-outlined" style={{ fontSize: '14px' }}>link</span>
                     <span className="text-mono" style={{ fontSize: '12px' }}>Explorer</span>
                  </div>
                </div>
              </div>
            ))
          ) : !isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>
               <p className="text-meta">Activity logs will appear here once you interact with contracts.</p>
            </div>
          ) : null}
        </div>
      </section>

    </div>
  );
}
