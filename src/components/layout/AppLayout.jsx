import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Navbar } from './Navbar.jsx';
import { BottomNav } from './BottomNav.jsx';
import { LoadingSpinner } from '../common/UIComponents.jsx';
import { AlertCircle, Database } from 'lucide-react';
import { SupabaseConfigModal } from '../common/SupabaseConfigModal.jsx';

export function AppLayout() {
  const { user, loading, isConfigured } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner text="Authenticating with Supabase..." size="lg" />
      </div>
    );
  }

  // If user is not authenticated, redirect to /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* Notice if Supabase credentials need verification */}
      {!isConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Supabase Setup Required:</strong> Connect your Supabase project URL and anon key to enable persistent PostgreSQL storage and RLS.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold border border-amber-500/30 text-[11px] shrink-0"
            >
              Configure Now
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        <Outlet />
      </main>

      <BottomNav />

      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
