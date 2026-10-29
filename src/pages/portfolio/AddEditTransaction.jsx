import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createStockTransaction,
  updateStockTransaction,
  fetchTransactionById,
  deleteStockTransaction,
} from '../../services/stockService.js';
import { formatCurrency, roundTo } from '../../utils/calculations.js';
import { ConfirmDialog, LoadingSpinner } from '../../components/common/UIComponents.jsx';
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  BarChart3,
  Calculator,
} from 'lucide-react';

export function AddEditTransaction() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const currencySymbol = profile?.preferred_currency || '₹';

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [transactionType, setTransactionType] = useState(
    searchParams.get('type') || 'buy'
  );
  const [symbol, setSymbol] = useState(searchParams.get('symbol') || '');
  const [companyName, setCompanyName] = useState(
    searchParams.get('company') ? decodeURIComponent(searchParams.get('company')) : ''
  );
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [charges, setCharges] = useState('20');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Load existing transaction if editing
  useEffect(() => {
    if (isEditing && user) {
      async function loadTx() {
        try {
          setLoading(true);
          const data = await fetchTransactionById(id, user.id);
          setTransactionType(data.transaction_type);
          setSymbol(data.symbol);
          setCompanyName(data.company_name);
          setQuantity(String(data.quantity));
          setPrice(String(data.price));
          setCharges(String(data.brokerage_charges || 0));
          setTransactionDate(data.transaction_date);
          setNotes(data.notes || '');
        } catch (err) {
          setError(err.message || 'Failed to load transaction');
        } finally {
          setLoading(false);
        }
      }
      loadTx();
    }
  }, [id, user, isEditing]);

  // Real-time Total Calculation
  const qtyNum = Math.max(0, parseInt(quantity, 10) || 0);
  const priceNum = Math.max(0, Number(price) || 0);
  const chargesNum = Math.max(0, Number(charges) || 0);
  const tradeValue = qtyNum * priceNum;
  const netTotal =
    transactionType === 'buy'
      ? roundTo(tradeValue + chargesNum)
      : roundTo(Math.max(0, tradeValue - chargesNum));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in');
      return;
    }

    if (!symbol.trim()) {
      setError('Please provide a stock symbol');
      return;
    }

    if (qtyNum <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (priceNum <= 0) {
      setError('Price per share must be greater than 0');
      return;
    }

    const payload = {
      transaction_type: transactionType,
      symbol: symbol.toUpperCase().trim(),
      company_name: companyName.trim() || symbol.toUpperCase().trim(),
      quantity: qtyNum,
      price: priceNum,
      brokerage_charges: chargesNum,
      transaction_date: transactionDate,
      notes,
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateStockTransaction(id, user.id, payload);
      } else {
        await createStockTransaction(user.id, payload);
      }
      navigate('/portfolio');
    } catch (err) {
      setError(err.message || 'Failed to save transaction');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !user) return;
    try {
      setSubmitting(true);
      await deleteStockTransaction(id, user.id);
      navigate('/transactions');
    } catch (err) {
      setError(err.message || 'Failed to delete transaction');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading transaction details..." size="lg" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/transactions"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isEditing ? 'Edit Stock Trade' : 'Record Stock Trade'}
            </h1>
            <p className="text-xs text-slate-400">
              Manual buy or sell execution logging with brokerage calculation
            </p>
          </div>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Delete Transaction"
          >
            <Trash2 className="w-4 h-4" />
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
        {/* Trade Type Switcher */}
        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-800 border border-slate-700">
          <button
            type="button"
            onClick={() => setTransactionType('buy')}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              transactionType === 'buy'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            BUY (Add to Holdings)
          </button>
          <button
            type="button"
            onClick={() => setTransactionType('sell')}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              transactionType === 'sell'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SELL (Reduce Holdings & Realize P&L)
          </button>
        </div>

        {/* Real-time Total Preview Banner */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                Net Trade Settlement Amount
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {formatCurrency(netTotal, currencySymbol)}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Gross Value: {formatCurrency(tradeValue, currencySymbol)}</div>
            <div className="text-[11px] text-slate-500">
              {transactionType === 'buy' ? '+ Charges added' : '- Charges deducted'}
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Stock Symbol / Ticker *
              </label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE, TCS, INFY"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono uppercase text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Reliance Industries Limited"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Quantity (Number of Shares) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Price Per Share ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.05"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1450.50"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Brokerage, STT & Taxes ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
                placeholder="e.g. 20.00"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Trade Execution Date *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Trade Notes & Rationale
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Long term accumulation on 200 EMA dip"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/portfolio"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-95 ${
              transactionType === 'buy'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {submitting
                ? 'Saving...'
                : isEditing
                ? 'Update Trade'
                : transactionType === 'buy'
                ? 'Record Buy Trade'
                : 'Record Sell Trade'}
            </span>
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this stock trade? Your portfolio cost basis and remaining holdings will be recalculated."
      />
    </div>
  );
}
