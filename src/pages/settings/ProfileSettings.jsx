import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { testSupabaseConnection } from '../../lib/supabaseClient.js';
import { seedDemoData } from '../../services/seedDataService.js';
import { SupabaseConfigModal } from '../../components/common/SupabaseConfigModal.jsx';
import {
  Settings,
  User,
  ShieldCheck,
  AlertCircle,
  Database,
  Smartphone,
  Save,
  LogOut,
  Sparkles,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { INVESTSATHI_SQL_SCHEMA } from '../../supabase/schemaSql.js';

export function ProfileSettings() {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dematAccount, setDematAccount] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [fyStart, setFyStart] = useState('04-01');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Connection & Seeding State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDematAccount(profile.demat_account_no || '');
      setPanNumber(profile.pan_number || '');
      setCurrency(profile.preferred_currency || '₹');
      setFyStart(profile.financial_year_start || '04-01');
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [profile, user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      setSaving(true);
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        demat_account_no: dematAccount.trim(),
        pan_number: panNumber.toUpperCase().trim(),
        preferred_currency: currency,
        financial_year_start: fyStart,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSeedData = async () => {
    if (!user) return;
    try {
      setSeeding(true);
      await seedDemoData(user.id);
      alert('Demo IPOs, Allotments, and Stock trades have been inserted into your Supabase database!');
      navigate('/');
    } catch (err) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(INVESTSATHI_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            Profile & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage your personal investor profile and Supabase PostgreSQL credentials
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Profile settings successfully updated in your Supabase profile table.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              Personal Investor Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Account
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  PAN Identifier
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white uppercase text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Default Demat Account / BOID (for autofill)
                </label>
                <input
                  type="text"
                  value={dematAccount}
                  onChange={(e) => setDematAccount(e.target.value)}
                  placeholder="16-digit Demat Account number"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Preferred Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="₹">₹ (Indian Rupee)</option>
                  <option value="$">$ (US Dollar)</option>
                  <option value="€">€ (Euro)</option>
                  <option value="£">£ (British Pound)</option>
                  <option value="AED ">AED (UAE Dirham)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Financial Year Start
                </label>
                <select
                  value={fyStart}
                  onChange={(e) => setFyStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="04-01">April 1 (India Standard)</option>
                  <option value="01-01">January 1 (Calendar Year)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>

          {/* Android Capacitor Information Card */}
          <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android APK Packaging Architecture (Capacitor)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              InvestSathi is built with mobile-first viewport meta (<code className="text-emerald-300 font-mono">viewport-fit=cover</code>), safe area insets for notches, bottom navigation, and relative client routing ready for Capacitor Android builds.
            </p>
            <div className="p-3 rounded-xl bg-slate-900 font-mono text-[11px] text-slate-300 space-y-1">
              <div>$ npm run build</div>
              <div>$ npx cap add android</div>
              <div>$ npx cap sync</div>
              <div>$ npx cap open android</div>
            </div>
          </div>
        </div>

        {/* Right Column: Supabase Status & Database Tools */}
        <div className="space-y-6">
          {/* Supabase Connection Card */}
          <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Supabase Backend
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                  isConfigured
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {isConfigured ? 'Active' : 'Unconfigured'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              InvestSathi is wired to real Supabase PostgreSQL with Row Level Security (RLS) policies protecting every user record.
            </p>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                {testing ? 'Testing...' : 'Test Backend Connection'}
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-colors"
              >
                Manage Credentials
              </button>

              <button
                type="button"
                onClick={handleCopySql}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-750 flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>{copiedSql ? '✓ Schema Copied to Clipboard!' : 'Copy SQL Schema for Supabase'}</span>
              </button>
            </div>
          </div>

          {/* Seed Sample Data Card */}
          <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Instant Data Seeder</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Want to see realistic IPO allotment records and stock trades in your database? Click below to seed real records into your account.
            </p>
            <button
              type="button"
              onClick={handleSeedData}
              disabled={seeding}
              className="w-full py-2.5 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-650 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{seeding ? 'Seeding Records...' : 'Seed Sample IPO & Stock Data'}</span>
            </button>
          </div>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
