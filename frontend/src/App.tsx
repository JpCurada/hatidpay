import { useState } from 'react';
import { Landing } from './views/Landing';
import { Dashboard } from './views/Dashboard';
import { CreateEscrow } from './views/CreateEscrow';
import { History } from './views/History';
import { EscrowDetail } from './views/EscrowDetail';
import { DisputeCenter } from './views/DisputeCenter';

import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { connectToFreighter } from './lib/freighter';

// Convex Hooks
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type ViewState = 'CONNECT' | 'DASHBOARD' | 'CREATE' | 'DETAIL' | 'DISPUTE' | 'HISTORY';

function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('CONNECT');
  const [activeEscrowId, setActiveEscrowId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Real Dynamic Data from Convex
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const userProfile = useQuery(api.users.getUser, wallet ? { stellarAddress: wallet } : "skip");

  const handleConnect = async () => {
    try {
      setLoading(true);
      const pubKey = await connectToFreighter();
      if (!pubKey) throw new Error("Could not retrieve public key.");
      
      // Atomic update of wallet + profile sync
      await getOrCreateUser({ 
        stellarAddress: pubKey,
        businessName: "SME Owner",
        businessType: "Retail"
      });
      
      setWallet(pubKey);
      setCurrentView('DASHBOARD');
    } catch (e: any) {
      console.error("Connection error:", e);
      alert(e.message || 'Failed to connect Freighter.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (view: ViewState, escrowId?: string) => {
    if (escrowId) setActiveEscrowId(escrowId);
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const renderView = () => {
    // If no wallet is connected, always show Landing
    if (!wallet) {
      return <Landing onConnect={handleConnect} loading={loading} />;
    }

    // Safeguard: Wait for userProfile metadata to load before showing dashboard to prevent property access errors
    if (currentView === 'DASHBOARD' && userProfile === undefined) {
      return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-meta animate-pulse">Syncing Business Profile...</div>
      </div>;
    }

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            wallet={wallet} 
            userName={userProfile?.businessName || "Valued SME"}
            onNavigate={(v, id?) => handleNavigate(v as any, id)}
          />
        );
      case 'CREATE':
        return (
          <CreateEscrow 
            buyerAddress={wallet} 
            onCancel={() => handleNavigate('DASHBOARD')} 
            onSuccess={(id) => { setActiveEscrowId(id); setCurrentView('DETAIL'); }} 
          />
        );
      case 'DETAIL':
        return (
          <EscrowDetail 
            escrowId={activeEscrowId} 
            walletAddress={wallet} 
            onBack={() => handleNavigate('DASHBOARD')}
            onDispute={(id) => { setActiveEscrowId(id); setCurrentView('DISPUTE'); }}
          />
        );
      case 'DISPUTE':
        return <DisputeCenter escrowId={activeEscrowId} onBack={() => handleNavigate('DETAIL')} />;
      case 'HISTORY':
        return (
          <History
            wallet={wallet}
            onViewEscrow={(id) => handleNavigate('DETAIL', id)}
          />
        );
      default:
        return <Dashboard wallet={wallet} userName={userProfile?.businessName || "SME"} onNavigate={(v, id?) => handleNavigate(v as any, id)} />;
    }
  };

  return (
    <div className="page-wrapper">
      <TopAppBar 
        wallet={wallet} 
        currentView={currentView} 
        onNavigate={handleNavigate as any}
        onConnect={handleConnect}
      />
      <main className="page-content">{renderView()}</main>
      <BottomNavBar currentView={currentView} onNavigate={handleNavigate as any} />
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, opacity: 0.05, pointerEvents: 'none', backgroundImage: 'url("https://www.transparenttextures.com/patterns/canvas-orange.png")' }} />
    </div>
  );
}

export default App;
