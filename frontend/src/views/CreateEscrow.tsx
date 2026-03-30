import React, { useState } from 'react';
import { createEscrow } from '../lib/stellar';
import { DEFAULT_DEADLINE_HOURS } from '../lib/config';

// Convex Hooks
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CreateEscrowProps {
  buyerAddress: string;
  onSuccess: (escrowId: string) => void;
  onCancel: () => void;
}

export function CreateEscrow({ buyerAddress, onSuccess, onCancel }: CreateEscrowProps) {
  const [supplierAddress, setSupplierAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState<number>(DEFAULT_DEADLINE_HOURS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Real-time Sync with DB
  const syncEscrowInDB = useMutation(api.escrows.syncEscrow);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierAddress || !amount) {
      setError('Please provide both an amount and a supplier address.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount.');
      }

      // 1. Blockchain Transaction (On-chain)
      const escrowId = await createEscrow(buyerAddress, {
        supplierAddress,
        amountUSDC: parsedAmount,
        deadlineHours: deadline,
      });

      // 2. Database Sync (Convex)
      // Mirroring the state so it appears in the dashboard instantly
      await syncEscrowInDB({
        escrowId: Number(escrowId), // Assuming numeric ID for indexing
        buyerAddress: buyerAddress,
        supplierAddress: supplierAddress,
        amountUsd: parsedAmount,
        status: "Created",
        deadlineAt: Date.now() + (deadline * 3600000),
        invoiceRef: `Escrow for ${supplierAddress.slice(0, 8)}...`,
        eventDetails: `Initialized payment protection: ${parsedAmount} USDC.`
      });

      onSuccess(escrowId);
    } catch (err: any) {
      setError(err.message || 'Failed to create escrow. Check balance/trustlines.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      <section>
        <button onClick={onCancel} className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
          Dashboard
        </button>
        <h1 className="display-lg">Secure Escrow</h1>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <form onSubmit={handleSubmit} className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h2 className="text-h1">Transaction Entry</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="input-label">Supplier Stellar Address</label>
            <input 
              type="text" 
              placeholder="G...ABCD" 
              value={supplierAddress}
              onChange={(e) => setSupplierAddress(e.target.value)}
              disabled={loading}
              className="input-neo-box"
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="input-label">Amount (USDC)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700 }}>$</span>
              <input 
                type="number" 
                step="0.0000001"
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className="input-neo-box"
                style={{ paddingLeft: '32px', fontSize: '1.25rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="input-label">Release Window (Auto-release)</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[24, 72, 168].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDeadline(h)}
                  className={`btn-neo btn-sm ${deadline === h ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-meta" style={{ color: 'var(--accent-red)' }}>{error}</p>}

          <button 
            type="submit" 
            disabled={loading || !amount || !supplierAddress}
            className="btn-neo btn-primary btn-full"
            style={{ padding: '1.25rem' }}
          >
            {loading ? 'Initializing On-Chain...' : 'Initialize Escrow →'}
          </button>
        </form>

        <div className="card-neo-accent" style={{ backgroundColor: 'var(--surface-container)' }}>
          <h2 className="text-h2">Transaction Summary</h2>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-body">Payment amount</span>
              <span className="text-h3">{amount || '0.00'} USDC</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-body">Protection Fee (0.5%)</span>
              <span className="text-h3">{(parseFloat(amount || '0') * 0.005).toFixed(2)} USDC</span>
            </div>
            <hr style={{ border: 'none', borderTop: '2px solid var(--text-main)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-h3">Total to Lock</span>
              <span className="text-h2">{(parseFloat(amount || '0') * 1.005).toFixed(2)} USDC</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
