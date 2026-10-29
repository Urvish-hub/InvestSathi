import React, { useState } from 'react';
import { Modal } from './UIComponents.jsx';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection } from '../../lib/supabaseClient.js';
import { INVESTSATHI_SQL_SCHEMA } from '../../supabase/schemaSql.js';

export function SupabaseConfigModal({ isOpen, onClose }) {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url || '');
  const [key, setKey] = useState(current.key || '');
  const [testStatus, setTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(null);
    const res = await testSupabaseConnection();
    setTestStatus(res);
    setTesting(false);
  };

  const isUrlPlaceholder = !url || url.includes('your-project-id');
  const isKeyValid = Boolean(key && key.length > 20 && !key.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'));

  const handleSave = (e) => {
    e.preventDefault();
    if (!url || !key) {
      alert('Please provide both Supabase Project URL and Publishable/Anon Key.');
      return;
    }
    if (url.includes('your-project-id')) {
      alert('Please replace "your-project-id" with your actual Supabase project reference (e.g. https://xyzcompany.supabase.co). You can find this in your Supabase Dashboard under Project Settings -> API.');
      return;
    }
    saveSupabaseConfig(url, key);
  };

  const handleReset = () => {
    if (confirm('Clear custom Supabase connection credentials?')) {
      clearSupabaseConfig();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(INVESTSATHI_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supabase Database & Auth Setup" maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="bg-slate-850 border border-slate-800 rounded-xl p-4 text-sm text-slate-300">
          <p className="font-semibold text-white mb-1">Real Supabase Integration</p>
          <p className="text-xs text-slate-400">
            InvestSathi connects to Supabase for authentication, PostgreSQL data storage, and Row Level Security (RLS).
            You can enter your credentials below (they are saved to your browser) or define them in your <code className="text-emerald-400 font-mono">.env</code> file.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Supabase Project URL *
              </label>
              {isUrlPlaceholder ? (
                <span className="text-[11px] font-semibold text-amber-400">⚠️ Needs your real project ID</span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-400">✓ Valid URL</span>
              )}
            </div>
            <input
              type="url"
              required
              placeholder="https://your-project-id.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border text-white placeholder-slate-500 text-sm focus:outline-none font-mono ${isUrlPlaceholder ? 'border-amber-500/60 focus:border-amber-500' : 'border-slate-700 focus:border-emerald-500'
                }`}
            />
            {isUrlPlaceholder ? (
              <p className="text-[11px] text-amber-300/90 mt-1.5 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                Found in your Supabase Dashboard: <strong>Project Settings → API → Project URL</strong> (e.g. <code className="text-white">https://abcdefghijkl.supabase.co</code>). Please replace <code className="text-amber-200">your-project-id</code>.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">Found in Supabase Project Settings → API → Project URL</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Supabase Publishable / Anon Key *
              </label>
              {isKeyValid ? (
                <span className="text-[11px] font-semibold text-emerald-400">✓ Key provided</span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-400">⚠️ Key required</span>
              )}
            </div>
            <textarea
              required
              rows={3}
              placeholder="sb_publishable_... or eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Found in Supabase Project Settings → API → anon / public key (NEVER use the service_role secret key!)
            </p>
          </div>

          {testStatus && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${testStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              {testStatus.message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {current.source === 'manual' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors"
                >
                  Clear Saved
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>

        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Database Schema (SQL Migrations)</h4>
              <p className="text-xs text-slate-400">Run this SQL in your Supabase project SQL Editor</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
              >
                {copiedSql ? '✓ Copied SQL!' : 'Copy SQL Schema'}
              </button>
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              >
                {showSql ? 'Hide SQL' : 'View SQL'}
              </button>
            </div>
          </div>

          {showSql && (
            <div className="relative mt-2">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
                {INVESTSATHI_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
