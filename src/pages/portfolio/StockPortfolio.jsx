import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchStockHoldings,
  saveManualMarketPrice,
} from '../../services/stockService.js';
import { formatCurrency, roundTo } from '../../utils/calculations.js';
import {
  StatCard,
  Modal,
  LoadingSpinner,
  EmptyState,
} from '../../components/common/UIComponents.jsx';
import {
  PieChart,
  Plus,
  TrendingUp,
  Wallet,
  DollarSign,
  AlertCircle,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';

export function StockPortfolio() {
  const { user, profile } = useAuth();
  const currencySymbol = profile?.preferred_currency || '₹';

  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manual Price Modal State
  const [selectedStockForPrice, setSelectedStockForPrice] = useState(null);
  const [manualPriceInput, setManualPriceInput] = useState('');

  const loadPortfolio = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStockHoldings(user.id);
      setHoldings(data.holdings || []);
    } catch (err) {
      setError(err.message || 'Failed to load stock holdings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [user]);

  const handleSavePrice = (e) => {
    e.preventDefault();
    if (!selectedStockForPrice) return;

    const num = Number(manualPriceInput);
    if (isNaN(num) || num < 0) {
      alert('Please enter a valid price');
      return;
    }

    saveManualMarketPrice(selectedStockForPrice.symbol, num);
    setSelectedStockForPrice(null);
    setManualPriceInput('');
    loadPortfolio();
  };

  // Summaries
  const activeHoldings = holdings.filter((h) => h.isActiveHolding);
  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalRealized = 0;
  let hasMissingPrices = false;

  for (const h of activeHoldings) {
    totalInvested += h.investedValue;
    if (h.currentValue !== null) {
      totalCurrentValue += h.currentValue;
    } else {
      hasMissingPrices = true;
    }
  }

  for (const h of holdings) {
    totalRealized += h.realizedPnL;
  }

  const totalUnrealized = totalCurrentValue - totalInvested;
  const totalUnrealizedPercent = totalInvested > 0 ? (totalUnrealized / totalInvested) * 100 : 0;

  if (loading) {
    return <LoadingSpinner text="Computing stock portfolio and cost basis..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-400" />
            Stock Holdings & Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Holdings calculated using weighted average cost basis (WACB)
          </p>
        </div>
        <Link
          to="/transactions/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock Trade</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual Price Policy Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Manual Market Pricing:</span> As per your design specifications, stock market valuations rely on your manually entered closing prices rather than external live feeds. Click <strong>"Set Price"</strong> on any stock to update current valuation and unrealized gains.
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <StatCard
          title="Stock Capital Invested"
          value={formatCurrency(totalInvested, currencySymbol)}
          subValue={`${activeHoldings.length} Active Holdings`}
          icon={Wallet}
          color="blue"
        />

        <StatCard
          title="Current Portfolio Value"
          value={hasMissingPrices ? 'Needs Price Input' : formatCurrency(totalCurrentValue, currencySymbol)}
          subValue={hasMissingPrices ? 'Some stocks missing manual price' : 'Based on manual CMP'}
          icon={TrendingUp}
          color="emerald"
        />

        <StatCard
          title="Unrealized P&L"
          value={hasMissingPrices ? 'Incomplete' : formatCurrency(totalUnrealized, currencySymbol)}
          subValue={hasMissingPrices ? 'Set all manual prices' : `${roundTo(totalUnrealizedPercent)}% return`}
          trend={totalUnrealized >= 0 ? 'up' : 'down'}
          trendValue={totalUnrealized >= 0 ? '+ Gain' : '- Loss'}
          icon={DollarSign}
          color={totalUnrealized >= 0 ? 'emerald' : 'rose'}
        />

        <StatCard
          title="Realized Gains"
          value={formatCurrency(totalRealized, currencySymbol)}
          subValue="From Closed Stock Sales"
          trend={totalRealized >= 0 ? 'up' : 'down'}
          trendValue={totalRealized >= 0 ? '+ Net' : '- Net'}
          icon={TrendingUp}
          color={totalRealized >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Holdings List */}
      {holdings.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No Stock Holdings Yet"
          description="Log your first stock buy transaction to start tracking your equity portfolio."
          actionText="+ Record Stock Buy"
          onAction={() => window.location.assign('/transactions/new')}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Active Stock Holdings</h2>
            <span className="text-xs text-slate-400 font-mono">
              {activeHoldings.length} Companies
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holdings.map((h) => {
              const hasPrice = h.manualPrice !== null && !isNaN(h.manualPrice);

              return (
                <div
                  key={h.symbol}
                  className={`rounded-2xl p-5 border shadow-lg transition-all flex flex-col justify-between ${
                    h.isActiveHolding
                      ? 'bg-slate-800/80 border-slate-700/70 hover:border-slate-600'
                      : 'bg-slate-850/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{h.symbol}</h3>
                          {!h.isActiveHolding && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              Position Closed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{h.companyName}</p>
                      </div>

                      {/* Manual CMP Badge / Action */}
                      {h.isActiveHolding && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStockForPrice(h);
                            setManualPriceInput(h.manualPrice ? String(h.manualPrice) : '');
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-xs text-slate-200 transition-colors"
                          title="Click to edit manual market price"
                        >
                          <span className="text-[10px] text-slate-400 uppercase">CMP:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {hasPrice ? `${currencySymbol}${h.manualPrice}` : 'Set Price'}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </div>

                    {/* Financial Data Grid */}
                    <div className="my-3 py-3 border-y border-slate-750 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-medium">
                          Holdings & Avg Buy
                        </span>
                        <span className="font-mono font-bold text-white">
                          {h.quantity} shares
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          Avg: {currencySymbol}{h.avgCostPerShare}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-medium">
                          Invested Value
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {formatCurrency(h.investedValue, currencySymbol)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          Cost Basis (WACB)
                        </span>
                      </div>

                      {/* Unrealized Valuation */}
                      {h.isActiveHolding && (
                        <>
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-medium">
                              Current Value
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {hasPrice ? formatCurrency(h.currentValue, currencySymbol) : 'Needs CMP'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase text-slate-400 block font-medium">
                              Unrealized P&L
                            </span>
                            {hasPrice ? (
                              <span
                                className={`font-mono font-bold flex items-center gap-0.5 ${
                                  h.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {h.unrealizedPnL >= 0 ? '+' : ''}
                                {formatCurrency(h.unrealizedPnL, currencySymbol)} ({h.unrealizedPnLPercent}%)
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">
                                Manual price required
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {h.realizedPnL !== 0 && (
                      <div className="mb-2 text-[11px] text-slate-400 flex justify-between">
                        <span>Realized gains from previous sales:</span>
                        <span
                          className={`font-mono font-semibold ${
                            h.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {h.realizedPnL >= 0 ? '+' : ''}{formatCurrency(h.realizedPnL, currencySymbol)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {h.isActiveHolding && (
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-750/50">
                      <Link
                        to={`/transactions/new?symbol=${h.symbol}&type=sell&company=${encodeURIComponent(h.companyName)}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20 transition-colors"
                      >
                        Sell Shares
                      </Link>
                      <Link
                        to={`/transactions/new?symbol=${h.symbol}&type=buy&company=${encodeURIComponent(h.companyName)}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                      >
                        + Buy More
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Price Update Modal */}
      <Modal
        isOpen={Boolean(selectedStockForPrice)}
        onClose={() => setSelectedStockForPrice(null)}
        title={`Set Manual Market Price: ${selectedStockForPrice?.symbol}`}
      >
        <form onSubmit={handleSavePrice} className="space-y-4">
          <p className="text-xs text-slate-300">
            Enter the latest manual closing / traded price for{' '}
            <strong className="text-white">{selectedStockForPrice?.companyName}</strong> ({selectedStockForPrice?.symbol}).
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Current Market Price ({currencySymbol}) *
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              required
              autoFocus
              value={manualPriceInput}
              onChange={(e) => setManualPriceInput(e.target.value)}
              placeholder="e.g. 1650.00"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Your average cost basis is {currencySymbol}{selectedStockForPrice?.avgCostPerShare}/share
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedStockForPrice(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Save Manual Price
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
