/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
// Main App Pages
import { Dashboard } from './pages/Dashboard';
import { IpoList } from './pages/ipo/IpoList';
import { AddEditIpo } from './pages/ipo/AddEditIpo';
import { IpoDetails } from './pages/ipo/IpoDetails';
import { StockPortfolio } from './pages/portfolio/StockPortfolio';
import { AddEditTransaction } from './pages/portfolio/AddEditTransaction';
import { TransactionHistory } from './pages/portfolio/TransactionHistory';
import { Reports } from './pages/reports/Reports';
import { InvestmentAnalytics } from './pages/analytics/InvestmentAnalytics';
import { ProfileSettings } from './pages/settings/ProfileSettings';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | any | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error | any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error | any, errorInfo: ErrorInfo) {
    console.error('App runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  getErrorMessage(): string {
    const err = this.state.error;
    if (!err) return 'An unexpected error occurred while rendering the application.';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      if (err.message) return err.message;
      if (err.error_description) return err.error_description;
      if (err.details) return `${err.message || 'Error'}: ${err.details}`;
    }
    return String(err);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.getErrorMessage();

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-slate-400 leading-relaxed break-words bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 font-mono text-left">
              {errorMessage}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch (e) {
                    console.error('Failed to clear storage:', e);
                  }
                  window.location.href = '/';
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs border border-slate-600 transition-all"
              >
                Reset Session & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Application Routes */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />

              {/* IPO Management */}
              <Route path="ipos" element={<IpoList />} />
              <Route path="ipos/new" element={<AddEditIpo />} />
              <Route path="ipos/:id" element={<IpoDetails />} />
              <Route path="ipos/:id/edit" element={<AddEditIpo />} />

              {/* Stock Portfolio & Transactions */}
              <Route path="portfolio" element={<StockPortfolio />} />
              <Route path="transactions" element={<TransactionHistory />} />
              <Route path="transactions/new" element={<AddEditTransaction />} />
              <Route path="transactions/:id/edit" element={<AddEditTransaction />} />

              {/* Reports & Analytics */}
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<InvestmentAnalytics />} />

              {/* Profile & Settings */}
              <Route path="settings" element={<ProfileSettings />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
