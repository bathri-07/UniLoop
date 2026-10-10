import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const collegeName = typeof user?.college === 'object' && user.college?.name 
    ? user.college.name 
    : 'IIT Bombay';

  return (
    <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Campus Selector */}
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse" />
            UniLoop
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-surface-elevated text-emerald-400 px-2.5 py-1 rounded-full border border-border-subtle font-mono">
            <MapPin className="w-3 h-3 text-brand-emerald" />
            <span>{collegeName}</span>
          </div>
        </div>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <Link to="/marketplace" className="hover:text-emerald-400 transition-colors font-medium">
            Marketplace
          </Link>
          <Link to="/" className="hover:text-emerald-400 transition-colors">
            System Status
          </Link>
        </nav>

        {/* User Account / Auth Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/create-listing"
            className="hidden sm:flex items-center gap-1.5 bg-brand-emerald text-slate-950 font-semibold px-3.5 py-1.5 rounded-xl text-xs hover:bg-emerald-400 transition-colors"
          >
            Post Item
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-white leading-tight">
                  {user.name}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {user.role} • Verified
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border-highlight flex items-center justify-center text-xs text-white font-semibold">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Logout"
                className="p-1.5 rounded-lg bg-surface-elevated hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-border-subtle transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-brand-emerald text-slate-950 font-semibold px-3.5 py-1.5 rounded-xl text-sm hover:bg-emerald-400 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
