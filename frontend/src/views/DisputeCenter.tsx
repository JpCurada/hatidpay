import React, { useState } from 'react';

interface DisputeCenterProps {
  escrowId: string;
  onBack: () => void;
}

export function DisputeCenter({ escrowId, onBack }: DisputeCenterProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { id: 'not_received', label: 'Goods Not Received' },
    { id: 'damaged', label: 'Items Damaged' },
    { id: 'quality', label: 'Quality Issues' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="animate-slide-up stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Header */}
      <section>
        <button onClick={onBack} className="text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
          Escrow Detail
        </button>
        <h1 className="display-lg">Dispute Center</h1>
        <p className="text-body" style={{ marginTop: '0.5rem', borderLeft: '4px solid var(--accent-red)', paddingLeft: '1rem', opacity: 0.8 }}>
          Resolving issues for Escrow <span className="text-mono" style={{ fontWeight: 700 }}>#HP-{escrowId}</span>
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Dispute Form */}
        <div className="card-neo" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="input-label">01 SELECT DISPUTE REASON</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reasons.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: reason === r.id ? 'var(--accent-red)' : 'var(--bg-white)',
                    color: reason === r.id ? 'white' : 'var(--text-main)',
                    border: '3px solid var(--text-main)',
                    boxShadow: reason === r.id ? 'none' : 'var(--shadow-neo-sm)',
                    transform: reason === r.id ? 'translate(2px, 2px)' : 'none',
                    textAlign: 'left',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                    {reason === r.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-h3" style={{ flex: 1 }}>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="input-label" htmlFor="details">02 ADDITIONAL DETAILS</label>
            <textarea 
              id="details"
              placeholder="Describe the issue in detail for our arbitration team..." 
              className="input-neo-box"
              style={{ minHeight: '120px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <label className="input-label">03 UPLOAD EVIDENCE</label>
             <div style={{ 
               border: '3px dashed var(--text-main)', 
               padding: '2rem', 
               textAlign: 'center',
               backgroundColor: 'var(--surface-container)',
               cursor: 'pointer'
             }}>
                <span className="material-icons-outlined" style={{ fontSize: '48px', opacity: 0.3 }}>cloud_upload</span>
                <p className="text-h3" style={{ marginTop: '0.5rem' }}>Drag files here</p>
                <p className="text-meta" style={{ marginTop: '0.25rem' }}>PNG, JPG, PDF (Max 10MB)</p>
             </div>
          </div>

          <button 
            disabled={loading || !reason}
            className="btn-neo btn-danger btn-full"
            style={{ padding: '1.25rem' }}
          >
            {loading ? 'Submitting Dispute...' : 'Freeze Funds & Notify Anchor →'}
          </button>
          
          <p className="text-meta" style={{ textAlign: 'center', opacity: 0.7 }}>
            By clicking, you initiate a formal legal review process.
          </p>
        </div>

        {/* Compliance Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card-neo-flat" style={{ borderTop: '8px solid var(--accent-red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
               <span className="material-icons-outlined" style={{ fontSize: '24px' }}>gavel</span>
               <h2 className="text-h2">Escrow Compliance</h2>
            </div>
            <p className="text-body" style={{ marginTop: '1rem' }}>
              The anchor/compliance officer will review the case within 48 hours.
            </p>
            <p className="text-body" style={{ marginTop: '1rem', fontWeight: 600 }}>
              Funds will remain locked in the secure escrow vault until a resolution is reached or arbitration is completed.
            </p>
          </div>

          <div className="card-neo" style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg)' }}>
             <h3 className="text-h3" style={{ color: 'var(--accent-yellow)', marginBottom: '0.5rem' }}>Why Raise a Dispute?</h3>
             <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {[
                 'Incorrect items received',
                 'Significant delivery delays',
                 'Unresponsive supplier',
                 'Fraudulent activity suspected'
               ].map((item, index) => (
                 <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--accent-red)' }}>remove</span>
                    <span className="text-meta" style={{ color: 'var(--bg)' }}>{item}</span>
                 </li>
               ))}
             </ul>
          </div>

        </div>

      </section>

    </div>
  );
}
