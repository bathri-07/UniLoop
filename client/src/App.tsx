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
  LogIn, 
  UserPlus,
  ArrowRight,
  Plus,
  Leaf,
  Lock,
  Search,
  Key
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
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 space-y-16">
      {/* 1. Hero Section - Inspired by design/Html -> Body.png */}
      <section className="text-center space-y-6 max-w-3xl mx-auto pt-4" aria-labelledby="hero-heading">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-dark/40 border border-brand-emerald/30 text-emerald-400 text-xs font-medium">
          <Leaf className="w-3.5 h-3.5" />
          <span>Verified Campus Circular Exchange • Institutional Auth Only</span>
        </div>

        <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Your Campus. Your Community.{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent block sm:inline">
            Your Next Find.
          </span>
        </h1>

        <p className="text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Buy, sell, and pass down textbooks, calculators, lab gear, and hostel essentials with fellow students. Zero stranger danger, zero shipping wait times.
        </p>

        {/* Action CTAs */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/marketplace"
            className="bg-brand-emerald text-slate-950 font-bold px-6 py-3.5 rounded-xl text-sm hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-sm focus-ring"
          >
            <span>Explore Campus Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {user ? (
            <Link
              to="/create-listing"
              className="bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus-ring"
            >
              <Plus className="w-4 h-4 text-brand-emerald" />
              <span>Post an Item (+ Earn)</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus-ring"
              >
                <LogIn className="w-4 h-4" />
                <span>Demo Logins</span>
              </Link>
              <Link
                to="/register"
                className="bg-surface-elevated text-slate-200 border border-border-subtle hover:border-border-highlight px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus-ring"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          <span>Restricted to authorized collegiate domains (@iitb.ac.in)</span>
        </div>
      </section>

      {/* 2. 4-Step Handover Trust Architecture - docs/design-adaptation.md § 5 */}
      <section className="space-y-6" aria-labelledby="trust-heading">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono uppercase tracking-wider bg-surface px-3 py-1 rounded-full border border-border-subtle">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Zero Stranger Danger</span>
          </div>
          <h2 id="trust-heading" className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Engineered Exclusively for Campus Life
          </h2>
          <p className="text-xs md:text-sm text-muted">
            No shipping fees, no waiting weeks for couriers. In-person handshakes between verified university peers at designated landmark safe spots.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 relative shadow-lg">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono text-emerald-400 font-bold">STEP 01</span>
              <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            </div>
            <h3 className="font-bold text-white text-sm">Verify with Campus Email</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Login requires a valid university institutional domain (.ac.in). Outside domains are rejected with zero bot activity.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 relative shadow-lg">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono text-emerald-400 font-bold">STEP 02</span>
              <Search className="w-4 h-4 text-brand-emerald" />
            </div>
            <h3 className="font-bold text-white text-sm">Discover or Request Nearby</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Search by exact Course Code (e.g. CS201), textbook ISBN, or hostel pickup point. Filter by direct sale or free senior giveaway.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 relative shadow-lg">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono text-emerald-400 font-bold">STEP 03</span>
              <Lock className="w-4 h-4 text-brand-emerald" />
            </div>
            <h3 className="font-bold text-white text-sm">48h Safe Landmark Hold</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Accepting a request reserves the item atomically for 48 hours. Prevents ghosting and double bookings during semester rush.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 space-y-3 relative shadow-lg">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-mono text-emerald-400 font-bold">STEP 04</span>
              <Key className="w-4 h-4 text-brand-emerald" />
            </div>
            <h3 className="font-bold text-white text-sm">Inspect & Handover PIN</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Inspect the item at the Central Library or SAC. Buyer presents a secure 4-digit PIN generated at accept time to finalize exchange.
            </p>
          </div>
        </div>
      </section>

      {/* 3. System Infrastructure Diagnostics Dashboard */}
      <section className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-8 space-y-6 shadow-xl" aria-labelledby="status-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <h2 id="status-heading" className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-brand-emerald" />
              <span>Infrastructure & API Diagnostics</span>
            </h2>
            <p className="text-xs text-muted mt-1 font-mono">
              Live Probe Target: GET /api/v1/health
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
                <span>Systems Operational</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                Connection Degraded
              </span>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
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
              1-Click Logins active
            </div>
          </div>
        </div>

        {/* Feature Check List */}
        <div className="pt-2 border-t border-border-subtle/80">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
              <span>Campus Domain Authentication (IIT Bombay @iitb.ac.in enforced; @gmail.com rejected)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
              <span>Product Marketplace with 8-Category Taxonomy & INR ₹ pricing</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
              <span>Contact privacy protection (public endpoints never expose phone or email)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
              <span>Real-time suspension and verification gatekeepers</span>
            </li>
          </ul>
        </div>
      </section>
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
          <footer className="border-t border-border-subtle py-8 text-center text-xs text-muted space-y-2 mt-auto">
            <div className="flex items-center justify-center gap-4 text-slate-400">
              <Link to="/marketplace" className="hover:text-emerald-400 transition-colors">Marketplace</Link>
              <span>•</span>
              <Link to="/create-listing" className="hover:text-emerald-400 transition-colors">Post an Item</Link>
              <span>•</span>
              <Link to="/" className="hover:text-emerald-400 transition-colors">System Diagnostics</Link>
            </div>
            <p className="text-slate-500">
              UniLoop — Campus Second-Hand Exchange &bull; Indian Campus Environment (INR &bull; +91) &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};
