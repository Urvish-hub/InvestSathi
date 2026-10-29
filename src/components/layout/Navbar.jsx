import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  TrendingUp,
  Plus,
  ShieldCheck,
  AlertTriangle,
  User,
  LogOut,
  Settings,
  FileText,
  BarChart3,
  Layers,
  History,
} from 'lucide-react';
import { SupabaseConfigModal } from '../common/SupabaseConfigModal.jsx';

export function Navbar() {
  const { user, profile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Investor';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  InvestSathi
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    IPO & Stocks
                  </span>
                </span>
                <span className="hidden sm:block text-[11px] text-slate-400 font-medium">Smart Portfolio & Allotment Tracker</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/ipos"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                IPO Tracker
              </Link>
              <Link
                to="/portfolio"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Stock Portfolio
              </Link>
              <Link
                to="/transactions"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                History
              </Link>
              <Link
                to="/analytics"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Analytics
              </Link>
              <Link
                to="/reports"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                Reports
              </Link>
            </nav>

            {/* Right side controls */}
            <div className="flex items-center gap-2.5">
              {/* Supabase Status Pill */}
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${isConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
                  }`}
                title={isConfigured ? 'Supabase connected' : 'Configure Supabase'}
              >
                {isConfigured ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Supabase Live</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Setup Supabase</span>
                  </>
                )}
              </button>

              {/* Action Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Entry</span>
                </button>

                {showAddMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowAddMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-slate-850 border border-slate-700 rounded-xl shadow-xl z-40 py-1 overflow-hidden animate-fadeIn">
                      <Link
                        to="/ipos/new"
                        onClick={() => setShowAddMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
                      >
                        <Layers className="w-4 h-4 text-emerald-400" />
                        Apply for IPO
                      </Link>
                      <Link
                        to="/transactions/new"
                        onClick={() => setShowAddMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-blue-400"
                      >
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        Stock Transaction
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* User Avatar / Profile */}
              <Link
                to="/settings"
                className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title={`Logged in as ${displayName}`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                  {displayName.charAt(0)}
                </div>
                <span className="hidden lg:inline text-xs font-medium max-w-[100px] truncate">
                  {displayName}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
}
