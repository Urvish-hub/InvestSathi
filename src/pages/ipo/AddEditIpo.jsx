import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createIpoApplication,
  updateIpoApplication,
  fetchIpoById,
  deleteIpoApplication,
} from '../../services/ipoService.js';
import { calculateIpoApplication, formatCurrency } from '../../utils/calculations.js';
import { ConfirmDialog, LoadingSpinner } from '../../components/common/UIComponents.jsx';
import {
  Layers,
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Calculator,
  Check,
  Building,
} from 'lucide-react';

export function AddEditIpo() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const currencySymbol = profile?.preferred_currency || '₹';

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [applicationNo, setApplicationNo] = useState('');
  const [category, setCategory] = useState('retail');
  const [dematAccount, setDematAccount] = useState(profile?.demat_account_no || '');
  const [bidPrice, setBidPrice] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [lotsApplied, setLotsApplied] = useState('1');
  const [isCutoff, setIsCutoff] = useState(true);
  const [upiOrAsba, setUpiOrAsba] = useState('');
  const [bankName, setBankName] = useState('');
  const [applicationDate, setApplicationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState('applied');

  // Load existing IPO if editing
  useEffect(() => {
    if (isEditing && user) {
      async function loadIpo() {
        try {
          setLoading(true);
          const data = await fetchIpoById(id, user.id);
          setCompanyName(data.company_name || '');
          setSymbol(data.symbol || '');
          setApplicationNo(data.application_no || '');
          setCategory(data.category || 'retail');
          setDematAccount(data.demat_account || '');
          setBidPrice(data.bid_price ? String(data.bid_price) : '');
          setLotSize(data.lot_size ? String(data.lot_size) : '');
          setLotsApplied(data.lots_applied ? String(data.lots_applied) : '1');
          setUpiOrAsba(data.upi_or_asba || '');
          setBankName(data.bank_name || '');
          setApplicationDate(data.application_date || new Date().toISOString().split('T')[0]);
          setStatus(data.status || 'applied');
        } catch (err) {
          setError(err.message || 'Failed to load IPO application');
        } finally {
          setLoading(false);
        }
      }
      loadIpo();
    }
  }, [id, user, isEditing]);

  // Real-time calculations
  const { totalSharesApplied, applicationAmount } = calculateIpoApplication(
    bidPrice,
    lotSize,
    lotsApplied
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in to save applications');
      return;
    }

    if (!bidPrice || Number(bidPrice) <= 0) {
      setError('Please provide a valid bid price');
      return;
    }

    if (!lotSize || parseInt(lotSize, 10) <= 0) {
      setError('Please enter a valid lot size');
      return;
    }

    const payload = {
      company_name: companyName,
      symbol,
      application_no: applicationNo,
      category,
      demat_account: dematAccount,
      bid_price: Number(bidPrice),
      lot_size: parseInt(lotSize, 10),
      lots_applied: parseInt(lotsApplied, 10) || 1,
      total_shares_applied: totalSharesApplied,
      application_amount: applicationAmount,
      application_date: applicationDate,
      upi_or_asba: upiOrAsba,
      bank_name: bankName,
      status,
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateIpoApplication(id, user.id, payload);
        navigate(`/ipos/${id}`);
      } else {
        const created = await createIpoApplication(user.id, payload);
        navigate(`/ipos/${created.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to save IPO application');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !user) return;
    try {
      setSubmitting(true);
      await deleteIpoApplication(id, user.id);
      navigate('/ipos');
    } catch (err) {
      setError(err.message || 'Failed to delete IPO application');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading IPO details..." size="lg" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={isEditing ? `/ipos/${id}` : '/ipos'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isEditing ? 'Edit IPO Application' : 'New IPO Application'}
            </h1>
            <p className="text-xs text-slate-400">
              Record bid details and ASBA blocked investment capital
            </p>
          </div>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete Application</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Real-time Financial Calculation Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-850 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Application Summary & Blocked ASBA Capital
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-medium">Total Shares</span>
              <span className="font-mono text-lg font-bold text-white">
                {totalSharesApplied} shares
              </span>
              <span className="text-[11px] text-slate-400 block">
                ({lotsApplied || 0} lot{lotsApplied > 1 ? 's' : ''} × {lotSize || 0})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-medium">Application Amount</span>
              <span className="font-mono text-lg font-bold text-emerald-400">
                {formatCurrency(applicationAmount, currencySymbol)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Blocked in ASBA bank
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase text-slate-400 block font-medium">Accounting Rule</span>
              <span className="text-[11px] text-slate-400 block leading-tight">
                Not treated as invested capital until shares are officially allotted.
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Company & Basic Info */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            Company & Ticker Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Premier Energies Limited"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Ticker Symbol *
              </label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. PREMIERENE"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm uppercase font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Application Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="retail">Retail Individual Investor (RII - up to ₹2 Lakhs)</option>
                <option value="hni">HNI / NII (Small & Big HNI)</option>
                <option value="shareholder">Shareholder Quota</option>
                <option value="employee">Employee Quota</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Application / ASBA Reference No.
              </label>
              <input
                type="text"
                value={applicationNo}
                onChange={(e) => setApplicationNo(e.target.value)}
                placeholder="e.g. ASBA-849201"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bid Details & Pricing */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Bid & Lot Calculations
            </h2>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={isCutoff}
                onChange={(e) => setIsCutoff(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span>Bid at Cut-off Price</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Bid Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                required
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
                placeholder="e.g. 450"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Lot Size (Shares/Lot) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                placeholder="e.g. 33"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Lots Applied *
              </label>
              <input
                type="number"
                min="1"
                required
                value={lotsApplied}
                onChange={(e) => setLotsApplied(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payment, Demat & Status */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Payment & Application Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Demat Account / DP ID
              </label>
              <input
                type="text"
                value={dematAccount}
                onChange={(e) => setDematAccount(e.target.value)}
                placeholder="16-digit Demat / BOID"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                UPI ID or ASBA Mandate
              </label>
              <input
                type="text"
                value={upiOrAsba}
                onChange={(e) => setUpiOrAsba(e.target.value)}
                placeholder="e.g. investor@okhdfcbank"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank, SBI, ICICI"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Application Date *
              </label>
              <input
                type="date"
                required
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Application Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="applied">Applied (Awaiting Allotment)</option>
                <option value="allotted">Allotted (Shares Received)</option>
                <option value="not_allotted">Not Allotted (Refunded)</option>
                <option value="listed">Listed on Stock Exchanges</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to={isEditing ? `/ipos/${id}` : '/ipos'}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : isEditing ? 'Update Application' : 'Save IPO Application'}</span>
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete IPO Application"
        message="Are you sure you want to delete this IPO application? All allotment records and associated share sales will be deleted from your database."
      />
    </div>
  );
}
