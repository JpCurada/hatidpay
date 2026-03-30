import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { getUsdcBalance } from '../lib/stellar';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/account';

interface DashboardProps {
  wallet: string;
  userName: string;
  onNavigate: (view: any, escrowId?: string) => void;
}

function SkeletonCard() {
  return (
    <div className="card-neo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        <div className="skeleton" style={{ height: '24px', width: '80px' }} />
        <div className="skeleton" style={{ height: '20px', width: '180px' }} />
        <div className="skeleton" style={{ height: '14px', width: '120px' }} />
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="skeleton" style={{ height: '14px', width: '50px', marginLeft: 'auto' }} />
        <div className="skeleton" style={{ height: '22px', width: '90px' }} />
      </div>
    </div>
  );
}

export function Dashboard({ wallet, userName, onNavigate }: DashboardProps) {
  const escrows = useQuery(api.escrows.listMyEscrows, { userAddress: wallet });
  const activity = useQuery(api.escrows.getMyActivity, { userAddress: wallet, limit: 5 });
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  useEffect(() => {
    getUsdcBalance(wallet)
      .then(setUsdcBalance)
      .catch(() => setUsdcBalance('—'));
  }, [wallet]);

  const isLoading = escrows === undefined || activity === undefined;

  const activeEscrows = escrows?.filter(e => e.status === 'Created' || e.status === 'Funded') ?? [];
  const totalLocked = activeEscrows.reduce((sum, e) => sum + e.amountUsd, 0);

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* Page Header */}
      <section>
        <span className="text-meta">Overview</span>
        <h1 className="display-lg">Welcome, {userName}</h1>
      </section>

      {/* Balance + Stats Row */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {/* Balance Card */}
        <div className="card-neo-accent" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="text-meta" style={{ color: 'var(--text-main)' }}>Wallet Balance</span>
          {usdcBalance === null
            ? <div className="skeleton" style={{ height: '48px', width: '180px', marginTop: '0.25rem' }} />
            : <h2 className="display-lg" style={{ lineHeight: 1 }}>
                {usdcBalance} <span className="text-h2" style={{ opacity: 0.7 }}>USDC</span>
              </h2>
          }
          <a
            href={`${EXPLORER_BASE}/${wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-meta"
            style={{ marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}
          >
            <span className="material-icons-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
            View on Explorer
          </a>
        </div>

        {/* Active Escrows Stat */}
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="text-meta">Active Escrows</span>
          {isLoading
            ? <div className="skeleton" style={{ height: '48px', width: '60px', marginTop: '0.25rem' }} />
            : <h2 className="display-lg" style={{ lineHeight: 1 }}>{activeEscrows.length}</h2>
          }
          <span className="text-meta" style={{ opacity: 0.5 }}>In-flight</span>
        </div>

        {/* Total Locked Stat */}
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span className="text-meta">Total Locked</span>
          {isLoading
            ? <div className="skeleton" style={{ height: '48px', width: '140px', marginTop: '0.25rem' }} />
            : <h2 className="display-lg" style={{ lineHeight: 1 }}>
                {totalLocked.toFixed(2)} <span className="text-h2" style={{ opacity: 0.7 }}>USDC</span>
              </h2>
          }
          <span className="text-meta" style={{ opacity: 0.5 }}>Across active escrows</span>
        </div>
      </section>

      {/* Quick Actions */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h3 className="text-h2">Secure Transaction</h3>
            <p className="text-body" style={{ marginTop: '0.5rem' }}>Lock funds for a supplier. Auto-releases after 72h.</p>
          </div>
          <button onClick={() => onNavigate('CREATE')} className="btn-neo btn-primary btn-full">
            New Escrow +
          </button>
        </div>
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h3 className="text-h2">Transaction History</h3>
            <p className="text-body" style={{ marginTop: '0.5rem' }}>Full ledger of past and active escrow payments.</p>
          </div>
          <button onClick={() => onNavigate('HISTORY')} className="btn-neo btn-secondary btn-full">
            View History
          </button>
        </div>
      </section>

      {/* Active Escrows */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h2 className="text-h1">Active Escrows</h2>
          {isLoading && <span className="text-meta animate-pulse">Syncing...</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : escrows && escrows.length > 0 ? (
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
                  <p className="text-meta">{escrow.supplierAddress.slice(0, 8)}…{escrow.supplierAddress.slice(-4)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-meta">Amount</span>
                  <p className="text-h2" style={{ fontWeight: 700 }}>{escrow.amountUsd.toFixed(2)} USDC</p>
                </div>
              </div>
            ))
          ) : (
            <div className="card-neo-flat" style={{ textAlign: 'center', padding: '3rem', borderStyle: 'dashed' }}>
              <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>lock_open</span>
              <p className="text-body" style={{ marginTop: '1rem', opacity: 0.5 }}>No active escrows. Create one to get started.</p>
              <button onClick={() => onNavigate('CREATE')} className="btn-neo btn-primary" style={{ marginTop: '1.5rem' }}>
                New Escrow +
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h2 className="text-h1">Recent Activity</h2>
          <button onClick={() => onNavigate('HISTORY')} className="text-meta" style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}>
            View all →
          </button>
        </div>
        <div className="card-neo-flat" style={{ padding: 0 }}>
          {isLoading ? (
            [0, 1, 2].map(i => (
              <div key={i} style={{ padding: '1.25rem 1.5rem', borderBottom: i < 2 ? '2px solid var(--text-main)' : 'none', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div className="skeleton" style={{ height: '16px', width: '220px' }} />
                  <div className="skeleton" style={{ height: '12px', width: '100px' }} />
                </div>
                <div className="skeleton" style={{ height: '28px', width: '80px' }} />
              </div>
            ))
          ) : activity && activity.length > 0 ? (
            activity.map((item, index) => (
              <div key={item._id} style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: index !== activity.length - 1 ? '2px solid var(--text-main)' : 'none',
              }}>
                <div>
                  <h4 className="text-h3">{item.details}</h4>
                  <p className="text-meta" style={{ marginTop: '0.25rem' }}>
                    {new Date(item.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <a
                  href={`${EXPLORER_BASE}/${wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', flexShrink: 0 }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                  <span className="text-mono" style={{ fontSize: '11px' }}>Explorer</span>
                </a>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>
              <p className="text-meta">Activity will appear here once you interact with contracts.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
