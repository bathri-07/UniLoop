import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin, LogOut, Plus, Search, Menu, X, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const collegeName = typeof user?.college === 'object' && user.college?.name 
    ? user.college.name 
    : 'IIT Bombay';

  const isLinkActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Campus Selector */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-xl font-bold text-white tracking-tight flex items-center gap-2 hover:opacity-90 transition-opacity focus-ring rounded-lg p-1"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse" />
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              UniLoop
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-surface-elevated text-emerald-400 px-2.5 py-1 rounded-full border border-border-subtle font-mono">
            <MapPin className="w-3 h-3 text-brand-emerald shrink-0" />
            <span className="truncate max-w-[150px]">{collegeName}</span>
          </div>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Main Navigation">
          <Link
            to="/marketplace"
            className={`transition-colors font-medium py-1 border-b-2 ${
              isLinkActive('/marketplace')
                ? 'text-emerald-400 border-brand-emerald'
                : 'text-slate-300 border-transparent hover:text-white'
            }`}
          >
            Marketplace
          </Link>
          <Link
            to="/"
            className={`transition-colors font-medium py-1 border-b-2 ${
              isLinkActive('/')
                ? 'text-emerald-400 border-brand-emerald'
                : 'text-slate-300 border-transparent hover:text-white'
            }`}
          >
            System Status
          </Link>
        </nav>

        {/* User Account / Auth Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Quick Search shortcut */}
          <Link
            to="/marketplace"
            title="Search campus listings"
            className="p-2 rounded-xl bg-surface-elevated text-slate-400 hover:text-white border border-border-subtle hover:border-border-highlight transition-colors focus-ring"
          >
            <Search className="w-4 h-4" />
          </Link>

          {/* Post Item Action */}
          <Link
            to="/create-listing"
            className="bg-brand-emerald text-slate-950 font-semibold px-3.5 py-2 rounded-xl text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm focus-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Item</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2.5 pl-1">
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-white leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Verified
                </span>
              </div>
              <div
                title={user.name}
                className="w-8 h-8 rounded-full bg-surface-elevated border border-border-highlight flex items-center justify-center text-xs text-white font-semibold shadow-inner"
              >
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                title="Sign out of account"
                className="p-2 rounded-xl bg-surface-elevated hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-border-subtle hover:border-red-500/30 transition-colors focus-ring"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-elevated transition-colors focus-ring"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-surface-elevated text-white border border-border-subtle hover:border-border-highlight font-semibold px-3.5 py-2 rounded-xl text-xs transition-colors focus-ring"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu Toggle */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            to="/create-listing"
            className="bg-brand-emerald text-slate-950 font-semibold px-2.5 py-1.5 rounded-lg text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Post</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-xl bg-surface-elevated text-slate-300 hover:text-white border border-border-subtle focus-ring"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-surface border-b border-border-subtle px-4 pt-3 pb-5 space-y-3 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-2 text-xs bg-surface-elevated text-emerald-400 px-3 py-2 rounded-xl border border-border-subtle font-mono">
            <MapPin className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
            <span className="truncate">{collegeName}</span>
          </div>

          <nav className="flex flex-col space-y-1 text-sm font-medium">
            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${
                isLinkActive('/marketplace')
                  ? 'bg-brand-emerald/10 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:bg-surface-elevated'
              }`}
            >
              Marketplace
            </Link>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${
                isLinkActive('/')
                  ? 'bg-brand-emerald/10 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:bg-surface-elevated'
              }`}
            >
              System Status
            </Link>
            <Link
              to="/create-listing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-emerald-400 hover:bg-surface-elevated transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Post an Item
            </Link>
          </nav>

          <div className="pt-2 border-t border-border-subtle/80">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border-highlight flex items-center justify-center text-xs text-white font-semibold">
                    {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{user.name}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Verified Student</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-center text-xs font-semibold text-slate-300 bg-surface-elevated border border-border-subtle"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-center text-xs font-semibold text-slate-950 bg-brand-emerald"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
