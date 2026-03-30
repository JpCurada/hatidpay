import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { StatusBadge } from '../components/StatusBadge';

interface HistoryProps {
  wallet: string;
  onViewEscrow: (escrowId: string) => void;
}

export function History({ wallet, onViewEscrow }: HistoryProps) {
  const escrows = useQuery(api.escrows.listMyEscrows, { userAddress: wallet });
  const activity = useQuery(api.escrows.getMyActivity, { userAddress: wallet, limit: 50 });

  const isLoading = escrows === undefined || activity === undefined;

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <span className="text-meta">Ledger</span>
        <h1 className="display-lg">Transaction History</h1>
      </section>

      {/* All Escrows */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h2 className="text-h1">All Escrows</h2>
          {isLoading && <span className="text-meta animate-pulse">Loading...</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {escrows && escrows.length > 0 ? (
            escrows.map((escrow) => (
              <div
                key={escrow._id}
                className="card-neo"
                onClick={() => onViewEscrow(escrow.escrowId.toString())}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <StatusBadge status={escrow.status as any} />
                  <h3 className="text-h2" style={{ marginTop: '0.5rem' }}>
                    {escrow.invoiceRef || `Escrow #HP-${escrow.escrowId}`}
                  </h3>
                  <p className="text-meta">{escrow.supplierAddress.slice(0, 8)}...{escrow.supplierAddress.slice(-4)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-h2" style={{ fontWeight: 700 }}>{escrow.amountUsd.toFixed(2)} USDC</p>
                  <p className="text-meta" style={{ marginTop: '0.25rem' }}>
                    {new Date(escrow.deadlineAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            ))
          ) : !isLoading ? (
            <div className="card-neo-flat" style={{ textAlign: 'center', padding: '3rem', borderStyle: 'dashed' }}>
              <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.2 }}>receipt_long</span>
              <p className="text-body" style={{ marginTop: '1rem', opacity: 0.5 }}>No escrows yet.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Activity Log */}
      <section>
        <h2 className="text-h1" style={{ marginBottom: '1.5rem' }}>Activity Log</h2>
        <div className="card-neo-flat" style={{ padding: 0 }}>
          {activity && activity.length > 0 ? (
            activity.map((item, index) => (
              <div
                key={item._id}
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: index !== activity.length - 1 ? '2px solid var(--text-main)' : 'none',
                }}
              >
                <div>
                  <p className="text-h3">{item.details}</p>
                  <p className="text-meta" style={{ marginTop: '0.25rem' }}>
                    {new Date(item.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <span
                  className="text-meta"
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: '2px solid var(--text-main)',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.eventType.replace(/_/g, ' ')}
                </span>
              </div>
            ))
          ) : !isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>
              <p className="text-meta">No activity yet.</p>
            </div>
          ) : null}
        </div>
      </section>

    </div>
  );
}
