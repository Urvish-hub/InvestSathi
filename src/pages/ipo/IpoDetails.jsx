import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchIpoById,
  saveAllotmentDetails,
  saveListingDetails,
  recordIpoSale,
  deleteIpoSale,
  deleteIpoApplication,
} from '../../services/ipoService.js';
import {
  formatCurrency,
  roundTo,
  calculateAllotmentAmounts,
  calculateListingGain,
} from '../../utils/calculations.js';
import {
  Badge,
  Modal,
  ConfirmDialog,
  LoadingSpinner,
} from '../../components/common/UIComponents.jsx';
import {
  Layers,
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Calendar,
  Building,
  Plus,
  Clock,
  Info,
} from 'lucide-react';

export function IpoDetails() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const currencySymbol = profile?.preferred_currency || '₹';

  const [ipo, setIpo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [showAllotmentModal, setShowAllotmentModal] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);

  // Allotment Form State
  const [allottedShares, setAllottedShares] = useState('');
  const [allotmentDate, setAllotmentDate] = useState('');
  const [isNotAllotted, setIsNotAllotted] = useState(false);

  // Listing Form State
  const [listingPrice, setListingPrice] = useState('');
  const [listingDate, setListingDate] = useState('');
  const [dayHigh, setDayHigh] = useState('');
  const [dayLow, setDayLow] = useState('');

  // Sale Form State
  const [saleQty, setSaleQty] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleCharges, setSaleCharges] = useState('20');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState('');

  const [saving, setSaving] = useState(false);

  const loadIpo = async () => {
    if (!user || !id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchIpoById(id, user.id);
      setIpo(data);

      // Pre-fill modal states
      if (data.allotment) {
        setAllottedShares(String(data.allotment.allotted_shares || ''));
        setAllotmentDate(data.allotment.allotment_date || '');
        setListingPrice(data.allotment.listing_price ? String(data.allotment.listing_price) : '');
        setListingDate(data.allotment.listing_date || '');
        setDayHigh(data.allotment.listing_day_high ? String(data.allotment.listing_day_high) : '');
        setDayLow(data.allotment.listing_day_low ? String(data.allotment.listing_day_low) : '');
      } else {
        setAllottedShares(String(data.total_shares_applied || ''));
        setAllotmentDate(new Date().toISOString().split('T')[0]);
        setListingDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load IPO details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIpo();
  }, [id, user]);

  // Handlers
  const handleSaveAllotment = async (e) => {
    e.preventDefault();
    if (!user || !ipo) return;

    try {
      setSaving(true);
      const shares = isNotAllotted ? 0 : (parseInt(allottedShares, 10) || 0);
      const { allottedAmount, refundAmount } = calculateAllotmentAmounts(
        ipo.bid_price,
        ipo.application_amount,
        shares
      );

      await saveAllotmentDetails(ipo.id, user.id, {
        allotted_shares: shares,
        allotted_amount: allottedAmount,
        refund_amount: refundAmount,
        allotment_date: allotmentDate,
        isNotAllotted,
      });

      setShowAllotmentModal(false);
      await loadIpo();
    } catch (err) {
      alert(`Error saving allotment: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveListing = async (e) => {
    e.preventDefault();
    if (!user || !ipo) return;

    try {
      setSaving(true);
      await saveListingDetails(ipo.id, user.id, {
        listing_price: listingPrice,
        listing_date: listingDate,
        listing_day_high: dayHigh,
        listing_day_low: dayLow,
      });

      setShowListingModal(false);
      await loadIpo();
    } catch (err) {
      alert(`Error saving listing details: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!user || !ipo) return;

    const qty = parseInt(saleQty, 10);
    const maxSaleable = ipo.salesSummary?.remainingShares ?? (ipo.allotment?.allotted_shares || 0);

    if (qty > maxSaleable) {
      alert(`Cannot sell more than remaining shares (${maxSaleable})!`);
      return;
    }

    try {
      setSaving(true);
      await recordIpoSale(ipo, user.id, {
        quantity: qty,
        price: salePrice,
        brokerage_charges: saleCharges,
        transaction_date: saleDate,
        notes: saleNotes,
      });

      setShowSaleModal(false);
      setSaleQty('');
      setSalePrice('');
      await loadIpo();
    } catch (err) {
      alert(`Error recording sale: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete || !user) return;
    try {
      await deleteIpoSale(saleToDelete.id, user.id);
      setSaleToDelete(null);
      await loadIpo();
    } catch (err) {
      alert(`Error deleting sale: ${err.message}`);
    }
  };

  const handleDeleteIpo = async () => {
    if (!user || !ipo) return;
    try {
      await deleteIpoApplication(ipo.id, user.id);
      navigate('/ipos');
    } catch (err) {
      alert(`Error deleting IPO: ${err.message}`);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading IPO information..." size="lg" />;
  }

  if (error || !ipo) {
    return (
      <div className="p-8 text-center bg-slate-800 rounded-3xl max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">IPO Record Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">{error || 'This record could not be retrieved.'}</p>
        <Link
          to="/ipos"
          className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs"
        >
          Back to IPO List
        </Link>
      </div>
    );
  }

  const allottedSharesCount = ipo.allotment?.allotted_shares || 0;
  const listingPriceNum = ipo.allotment?.listing_price ? Number(ipo.allotment.listing_price) : null;
  const listingMetrics = listingPriceNum
    ? calculateListingGain(ipo.bid_price, listingPriceNum, allottedSharesCount)
    : null;

  const remainingShares = ipo.salesSummary?.remainingShares ?? allottedSharesCount;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/ipos"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {ipo.company_name}
              </h1>
              <Badge variant={ipo.status}>{ipo.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              NSE/BSE: {ipo.symbol} • Category: {ipo.category.toUpperCase()} • Bid Date: {ipo.application_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/ipos/${ipo.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit IPO</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
            title="Delete IPO"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lifecycle Progress Bar */}
      <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-4 sm:p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          IPO Lifecycle Progression
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
            1. Applied
            <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
              {formatCurrency(ipo.application_amount, currencySymbol)}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl border font-bold ${
              ipo.allotment
                ? allottedSharesCount > 0
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-slate-900/60 border-slate-750 text-slate-500'
            }`}
          >
            2. Allotment
            <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
              {ipo.allotment ? `${allottedSharesCount} shs` : 'Pending'}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl border font-bold ${
              listingPriceNum
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-slate-900/60 border-slate-750 text-slate-500'
            }`}
          >
            3. Listed
            <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
              {listingPriceNum ? `${currencySymbol}${listingPriceNum}` : 'Unlisted'}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl border font-bold ${
              ipo.salesSummary && ipo.salesSummary.totalSoldShares > 0
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-slate-900/60 border-slate-750 text-slate-500'
            }`}
          >
            4. Realized P&L
            <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
              {ipo.salesSummary && ipo.salesSummary.totalSoldShares > 0
                ? formatCurrency(ipo.salesSummary.totalRealizedPnL, currencySymbol)
                : 'Holding'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Key Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Application & ASBA Bid Details */}
        <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Application & Bid Details
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              {ipo.lots_applied} lot{ipo.lots_applied > 1 ? 's' : ''} ({ipo.lot_size} sh/lot)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
              <span className="text-[10px] text-slate-400 block uppercase">Bid Price</span>
              <span className="font-mono text-base font-bold text-white">
                {currencySymbol}{ipo.bid_price}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
              <span className="text-[10px] text-slate-400 block uppercase">Total Shares Applied</span>
              <span className="font-mono text-base font-bold text-white">
                {ipo.total_shares_applied}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750 col-span-2">
              <span className="text-[10px] text-slate-400 block uppercase">Application Blocked Amount</span>
              <span className="font-mono text-lg font-bold text-emerald-400">
                {formatCurrency(ipo.application_amount, currencySymbol)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Blocked via ASBA mandate until allotment date
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-750 text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Application / Ref:</span>
              <span className="font-mono">{ipo.application_no || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Demat / BOID:</span>
              <span className="font-mono">{ipo.demat_account || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">UPI / ASBA Mandate:</span>
              <span>{ipo.upi_or_asba || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bank:</span>
              <span>{ipo.bank_name || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Allotment Details */}
        <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Allotment Outcome
              </h2>
              <button
                type="button"
                onClick={() => setShowAllotmentModal(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
              >
                {ipo.allotment ? 'Update Allotment' : '+ Record Allotment'}
              </button>
            </div>

            {ipo.allotment ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
                    <span className="text-[10px] text-slate-400 block uppercase">Shares Allotted</span>
                    <span className="font-mono text-base font-bold text-white">
                      {ipo.allotment.allotted_shares} shares
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
                    <span className="text-[10px] text-slate-400 block uppercase">Actual Invested</span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {formatCurrency(ipo.allotment.allotted_amount, currencySymbol)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750 col-span-2">
                    <span className="text-[10px] text-slate-400 block uppercase">Refund Released</span>
                    <span className="font-mono text-base font-bold text-slate-200">
                      {formatCurrency(ipo.allotment.refund_amount, currencySymbol)}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Unblocked back to your bank account
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex justify-between pt-1">
                  <span>Allotment Date:</span>
                  <span className="font-medium text-slate-200">
                    {ipo.allotment.allotment_date || 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-750 text-center text-xs text-slate-400 space-y-2">
                <p>Allotment status is currently pending.</p>
                <button
                  type="button"
                  onClick={() => setShowAllotmentModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Record Allotment Result
                </button>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Crucial Rule:</strong> Only the actual allotted amount ({formatCurrency(ipo.allotment?.allotted_amount || 0, currencySymbol)}) counts towards active invested capital.
            </span>
          </div>
        </div>

        {/* Card 3: Listing Details */}
        <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Stock Exchange Listing
            </h2>
            <button
              type="button"
              onClick={() => setShowListingModal(true)}
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold border border-purple-500/30 transition-colors"
            >
              {listingPriceNum ? 'Edit Listing' : '+ Record Listing'}
            </button>
          </div>

          {listingPriceNum ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
                  <span className="text-[10px] text-slate-400 block uppercase">Listing Price</span>
                  <span className="font-mono text-base font-bold text-white">
                    {currencySymbol}{listingPriceNum}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
                  <span className="text-[10px] text-slate-400 block uppercase">Listing Day Gain %</span>
                  <span
                    className={`font-mono text-base font-bold ${
                      listingMetrics?.listingGainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {listingMetrics?.listingGainPercent >= 0
                      ? `+${listingMetrics?.listingGainPercent}%`
                      : `${listingMetrics?.listingGainPercent}%`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750 col-span-2">
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Gross Listing Day Value Gain
                  </span>
                  <span
                    className={`font-mono text-base font-bold ${
                      listingMetrics?.listingGainAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {listingMetrics?.listingGainAmount >= 0 ? '+' : ''}
                    {formatCurrency(listingMetrics?.listingGainAmount || 0, currencySymbol)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ({allottedSharesCount} allotted shares × gain of {currencySymbol}{roundTo(listingPriceNum - ipo.bid_price)}/share)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                <div>
                  Listing Date: <span className="text-white font-medium">{ipo.allotment.listing_date || 'N/A'}</span>
                </div>
                <div>
                  Day High/Low:{' '}
                  <span className="text-white font-mono">
                    {ipo.allotment.listing_day_high ? `${currencySymbol}${ipo.allotment.listing_day_high}` : '-'} /{' '}
                    {ipo.allotment.listing_day_low ? `${currencySymbol}${ipo.allotment.listing_day_low}` : '-'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-750 text-center text-xs text-slate-400 space-y-2">
              <p>Listing day price has not been recorded yet.</p>
              <button
                type="button"
                onClick={() => setShowListingModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Record Listing Day Data
              </button>
            </div>
          )}
        </div>

        {/* Card 4: Share Sales & Realized Profit Summary */}
        <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              IPO Share Sales & P&L
            </h2>
            <button
              type="button"
              disabled={allottedSharesCount === 0 || remainingShares === 0}
              onClick={() => setShowSaleModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-40 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Sale</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
              <span className="text-[10px] text-slate-400 block uppercase">Remaining Shares</span>
              <span className="font-mono text-base font-bold text-white">
                {remainingShares} / {allottedSharesCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-750">
              <span className="text-[10px] text-slate-400 block uppercase">Net Realized P&L</span>
              <span
                className={`font-mono text-base font-bold ${
                  (ipo.salesSummary?.totalRealizedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(ipo.salesSummary?.totalRealizedPnL || 0) >= 0 ? '+' : ''}
                {formatCurrency(ipo.salesSummary?.totalRealizedPnL || 0, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Sales Transactions List */}
          <div className="pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Sales Executed ({ipo.sales?.length || 0})
            </span>
            {ipo.sales && ipo.sales.length > 0 ? (
              <div className="space-y-2">
                {ipo.sales.map((sale) => {
                  const saleProfit = (sale.price - ipo.bid_price) * sale.quantity - (sale.brokerage_charges || 0);
                  return (
                    <div
                      key={sale.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-750 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          Sold {sale.quantity} shs @ {currencySymbol}{sale.price}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {sale.transaction_date} • Charges: {currencySymbol}{sale.brokerage_charges || 0}
                        </div>
                        {sale.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">{sale.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`font-mono font-bold block ${
                              saleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {saleProfit >= 0 ? '+' : ''}{formatCurrency(saleProfit, currencySymbol)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatCurrency(sale.total_amount, currencySymbol)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSaleToDelete(sale)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete sale record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No share sales recorded yet. Allotted shares are currently held.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Allotment Modal */}
      <Modal
        isOpen={showAllotmentModal}
        onClose={() => setShowAllotmentModal(false)}
        title="Record Allotment Details"
      >
        <form onSubmit={handleSaveAllotment} className="space-y-4">
          <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/90 border border-slate-700 cursor-pointer text-xs font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={isNotAllotted}
              onChange={(e) => {
                setIsNotAllotted(e.target.checked);
                if (e.target.checked) setAllottedShares('0');
              }}
              className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700"
            />
            <span>Not Allotted (Zero Shares - Full ASBA Refund)</span>
          </label>

          {!isNotAllotted && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Allotted Shares
              </label>
              <input
                type="number"
                min="0"
                max={ipo.total_shares_applied}
                required
                value={allottedShares}
                onChange={(e) => setAllottedShares(e.target.value)}
                placeholder={`Max ${ipo.total_shares_applied}`}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Shares applied: {ipo.total_shares_applied} ({ipo.lots_applied} lot{ipo.lots_applied > 1 ? 's' : ''})
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Allotment Date
            </label>
            <input
              type="date"
              required
              value={allotmentDate}
              onChange={(e) => setAllotmentDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAllotmentModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              {saving ? 'Saving...' : 'Save Allotment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Listing Modal */}
      <Modal
        isOpen={showListingModal}
        onClose={() => setShowListingModal(false)}
        title="Record Stock Exchange Listing Data"
      >
        <form onSubmit={handleSaveListing} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Listing Price ({currencySymbol}) *
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              required
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              placeholder="e.g. 990"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Issue/Bid price was {currencySymbol}{ipo.bid_price}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Listing Date
            </label>
            <input
              type="date"
              required
              value={listingDate}
              onChange={(e) => setListingDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Listing Day High
              </label>
              <input
                type="number"
                step="0.05"
                value={dayHigh}
                onChange={(e) => setDayHigh(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Listing Day Low
              </label>
              <input
                type="number"
                step="0.05"
                value={dayLow}
                onChange={(e) => setDayLow(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowListingModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
            >
              {saving ? 'Saving...' : 'Save Listing Details'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Share Sale Modal */}
      <Modal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        title="Record IPO Share Sale"
      >
        <form onSubmit={handleRecordSale} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            Available to sell: <strong>{remainingShares} shares</strong> (Cost basis: {currencySymbol}{ipo.bid_price}/share)
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Quantity to Sell *
              </label>
              <input
                type="number"
                min="1"
                max={remainingShares}
                required
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                placeholder={`1 to ${remainingShares}`}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Sale Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="e.g. 980"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Brokerage & Taxes ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={saleCharges}
                onChange={(e) => setSaleCharges(e.target.value)}
                placeholder="e.g. 20"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Sale Date *
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              placeholder="e.g. Sold listing day 50% lot"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {saleQty && salePrice && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-750 text-xs flex justify-between items-center">
              <span className="text-slate-400">Estimated Net Realized P&L:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(
                  (Number(salePrice) - Number(ipo.bid_price)) * Number(saleQty) - Number(saleCharges || 0),
                  currencySymbol
                )}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSaleModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              {saving ? 'Recording...' : 'Record Sale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete IPO Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteIpo}
        title="Delete IPO Application"
        message="Are you sure you want to delete this IPO application? All allotment records and associated share sales will be deleted from your database."
      />

      {/* Delete Sale Confirm */}
      <ConfirmDialog
        isOpen={!!saleToDelete}
        onClose={() => setSaleToDelete(null)}
        onConfirm={handleDeleteSale}
        title="Delete Sale Transaction"
        message={`Delete the sale record of ${saleToDelete?.quantity} shares at ${currencySymbol}${saleToDelete?.price}? The shares will be restored to remaining holdings.`}
      />
    </div>
  );
}
