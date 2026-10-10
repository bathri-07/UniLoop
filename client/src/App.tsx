import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CreateListingPage } from './pages/CreateListingPage';
import { api } from './services/api';
import { 
  CheckCircle2, 
  Activity, 
  Database, 
  ShieldCheck, 
  Server, 
  Layers, 
  Sparkles,
  LogIn,
  UserPlus
} from 'lucide-react';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  database: {
    isConnected: boolean;
    isReplicaSet: boolean;
    host: string;
    name: string;
  };
  environment: string;
  demoMode: boolean;
}

const HomeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const res = await api.get('/health');
        if (res.data?.success) {
          setHealth(res.data.data);
          setError(null);
        } else {
          setError(res.data?.message || 'Failed to probe backend');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to connect to backend on port 5000');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-dark/40 border border-brand-emerald/30 text-emerald-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Smart, Secure, Second-Hand Campus Exchange
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          UniLoop Campus Platform
        </h1>
        <p className="text-muted text-base md:text-lg">
          Campus-exclusive circular economy verified by institutional student email domains.
        </p>

        {/* User Status / Quick Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/marketplace"
            className="bg-brand-emerald text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Explore Campus Marketplace ↗
          </Link>
          {user ? (
            <Link
              to="/create-listing"
              className="bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              Post an Item (+ Earn)
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In (Demo Logins)
              </Link>
              <Link
                to="/register"
                className="bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Backend & Database Live Status Card */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-brand-emerald" />
              Infrastructure & Auth Health Probe
            </h2>
            <p className="text-xs text-muted mt-1 font-mono">
              Live Target: GET /api/v1/health
            </p>
          </div>
          <div>
            {loading ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-surface-elevated text-slate-300 animate-pulse border border-border-subtle">
                Probing backend...
              </span>
            ) : health?.database.isConnected ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-emerald/10 text-emerald-400 border border-brand-emerald/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Systems Operational
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                Connection Degraded
              </span>
            )}
          </div>
        </div>

        {/* Diagnostic Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-muted text-xs">
              <span>Express API</span>
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {loading ? '...' : error ? 'Offline' : 'Port 5000'}
            </div>
            <div className="text-[11px] text-muted">
              {health?.environment ? `Mode: ${health.environment}` : 'Active'}
            </div>
          </div>

          <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-muted text-xs">
              <span>Database</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {loading ? '...' : health?.database.isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-[11px] text-muted truncate">
              {health?.database.host ? `${health.database.host}/${health.database.name}` : '127.0.0.1:27017'}
            </div>
          </div>

          <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-muted text-xs">
              <span>DB Topology</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {loading ? '...' : health?.database.isReplicaSet ? 'Replica Set' : 'Standalone'}
            </div>
            <div className="text-[11px] text-muted">
              Atomic ops active
            </div>
          </div>

          <div className="bg-surface-elevated/70 border border-border-subtle rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-muted text-xs">
              <span>Demo Security</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {loading ? '...' : health?.demoMode ? 'DEMO_MODE' : 'Production'}
            </div>
            <div className="text-[11px] text-muted">
              1-Click Logins enabled
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2 Feature Verification Grid */}
      <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
          Phase 2 Authentication Capabilities Active
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
            Campus Domain Validation (IIT Bombay @iitb.ac.in enforced; @gmail.com blocked)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
            1-Click Demo Logins for Priya S. (Seller) & Rahul M. (Buyer)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
            One-time token email verification with replay protection
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
            Real-time Account Suspension Gate (blocked at login and protected routes)
          </li>
        </ul>
      </div>
    </main>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-canvas text-secondary flex flex-col font-sans">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/create-listing" element={<CreateListingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Routes>
          <footer className="border-t border-border-subtle py-6 text-center text-xs text-muted">
            UniLoop — Smart, Secure, Second-Hand Campus Exchange &copy; {new Date().getFullYear()}
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};
