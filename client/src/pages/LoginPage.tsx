import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, 
  AlertCircle, 
  ShieldCheck, 
  UserCheck, 
  Lock,
  Mail,
  ArrowRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, demoLogin, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<'priya' | 'rahul' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const success = await login(email, password);
    setLoading(false);

    if (success) {
      navigate('/marketplace');
    }
  };

  const handleDemoClick = async (account: 'priya' | 'rahul') => {
    clearError();
    setDemoLoading(account);
    const success = await demoLogin(account);
    setDemoLoading(null);

    if (success) {
      navigate('/marketplace');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-emerald/30 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Campus Domain Authenticated</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Sign in to UniLoop
          </h1>
          <p className="text-muted text-sm">
            Enter your verified institutional campus credentials.
          </p>
        </div>

        {/* 1-Click Demo Logins Banner - AGENTS.md § 3.6 */}
        <div className="bg-surface-elevated/90 border border-brand-emerald/30 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>1-Click Demo Login</span>
            </span>
            <span className="text-[10px] bg-brand-dark text-emerald-300 px-2 py-0.5 rounded font-mono">
              DEMO_MODE=true
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Instantly sign in using pre-seeded IIT Bombay student profiles for testing:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={demoLoading !== null || loading}
              onClick={() => handleDemoClick('priya')}
              className="bg-surface border border-border-highlight hover:border-brand-emerald p-3 rounded-xl text-left transition-all hover:-translate-y-0.5 flex flex-col justify-between group disabled:opacity-50 focus-ring"
            >
              <div>
                <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-brand-emerald" />
                  <span>Priya S.</span>
                </span>
                <span className="text-[11px] text-muted block truncate">
                  priya.senior@iitb.ac.in
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-2 flex items-center justify-between">
                <span>{demoLoading === 'priya' ? 'Signing in...' : 'Senior Seller'}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              disabled={demoLoading !== null || loading}
              onClick={() => handleDemoClick('rahul')}
              className="bg-surface border border-border-highlight hover:border-brand-emerald p-3 rounded-xl text-left transition-all hover:-translate-y-0.5 flex flex-col justify-between group disabled:opacity-50 focus-ring"
            >
              <div>
                <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-brand-emerald" />
                  <span>Rahul M.</span>
                </span>
                <span className="text-[11px] text-muted block truncate">
                  rahul.mech26@iitb.ac.in
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-2 flex items-center justify-between">
                <span>{demoLoading === 'rahul' ? 'Signing in...' : 'Fresher Buyer'}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>
        </div>

        {/* Regular Login Form Card */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 md:p-8 space-y-5 shadow-xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-slate-300">
                Campus Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@iitb.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-input border border-border-subtle focus:border-brand-emerald rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-emerald text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-400 transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2 focus-ring"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Authenticating...</span>
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Bottom link to Register */}
          <div className="text-center pt-2 border-t border-border-subtle/80 text-xs text-muted">
            <span>New student at IIT Bombay? </span>
            <Link to="/register" className="text-emerald-400 font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
