import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchIpoApplications } from '../services/ipoService.js';
import { fetchStockHoldings } from '../services/stockService.js';
import { seedDemoData } from '../services/seedDataService.js';
import { calculateOverallSummary, formatCurrency, roundTo } from '../utils/calculations.js';
import { StatCard, Badge, LoadingSpinner, EmptyState } from '../components/common/UIComponents.jsx';
import {
  Wallet,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

export function Dashboard() {
  const { user, profile } = useAuth();
  const [ipos, setIpos] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);

  const currencySymbol = profile?.preferred_currency || '₹';

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const [ipoList, stockData] = await Promise.all([
        fetchIpoApplications(user.id),
        fetchStockHoldings(user.id),
      ]);

      setIpos(ipoList || []);
      setHoldings(stockData.holdings || []);
      setTransactions(stockData.transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Error loading dashboard records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSeedData = async () => {
    if (!user) return;
    try {
      setSeeding(true);
      await seedDemoData(user.id);
      await loadData();
    } catch (err) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const summary = calculateOverallSummary(ipos, holdings, transactions);

  // Active / recent IPOs
  const activeIpos = ipos.slice(0, 4);

  // Recent 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, 5);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Investor';

  if (loading) {
    return <LoadingSpinner text="Fetching your investment records from Supabase..." size="lg" />;
  }

  const hasNoData = ipos.length === 0 && holdings.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-850 via-slate-800 to-emerald-950/40 p-5 sm:p-6 rounded-3xl border border-slate-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome back, {displayName}
            </h1>
            <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personal IPO Allotment & Stock Portfolio Dashboard
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/ipos/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Apply IPO</span>
          </Link>
          <Link
            to="/transactions/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-200 border border-slate-650 font-semibold text-xs sm:text-sm transition-all active:scale-95"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Stock Trade</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Database Error</p>
              <p className="text-xs text-rose-200 mt-0.5">{error}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Ensure you have executed the SQL migrations in your Supabase SQL editor.
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State with Instant Seeder */}
      {hasNoData && !error && (
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center max-w-2xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
            Your Investment Ledger is Clean
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
            Start logging your IPO applications, tracking allotment outcomes, recording listing day profits, and managing stock trades.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/ipos/new"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all"
            >
              + Apply for First IPO
            </Link>
            <button
              type="button"
              onClick={handleSeedData}
              disabled={seeding}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-200 border border-slate-650 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {seeding ? 'Seeding Real Records...' : 'Seed Sample IPO & Stock Data'}
            </button>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <StatCard
          title="Actual Invested"
          value={formatCurrency(summary.totalInvestedCapital, currencySymbol)}
          subValue="Allotted IPOs + Stocks"
          icon={Wallet}
          color="emerald"
        />

        <StatCard
          title="Realized Gains"
          value={formatCurrency(summary.totalRealizedPnL, currencySymbol)}
          subValue="From IPO & Stock Sales"
          icon={TrendingUp}
          trend={summary.totalRealizedPnL >= 0 ? 'up' : 'down'}
          trendValue={summary.totalRealizedPnL >= 0 ? '+ Profit' : '- Loss'}
          color={summary.totalRealizedPnL >= 0 ? 'emerald' : 'rose'}
        />

        <StatCard
          title="IPO Win Rate"
          value={`${summary.ipoAllotmentWinRate}%`}
          subValue={`${summary.ipoAllottedCount} allotted of ${summary.ipoTotalApplications}`}
          icon={Award}
          color="blue"
        />

        <StatCard
          title="Active IPOs"
          value={summary.ipoActiveApplications}
          subValue={`${formatCurrency(summary.ipoTotalAppliedAmount, currencySymbol)} total bids`}
          icon={Layers}
          color="amber"
        />
      </div>

      {/* Main Grid: IPOs and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active IPO Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                IPO Portfolio & Allotments
              </h2>
              <span className="text-xs text-slate-400 font-mono">({ipos.length})</span>
            </div>
            <Link
              to="/ipos"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {ipos.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
              No IPO applications yet. Click "Apply IPO" to record your bids.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {activeIpos.map((ipo) => {
                const allottedShares = ipo.allotment?.allotted_shares || 0;
                const hasListingPrice = !!ipo.allotment?.listing_price;
                const listingGainPercent = hasListingPrice
                  ? roundTo(((ipo.allotment.listing_price - ipo.bid_price) / ipo.bid_price) * 100)
                  : null;

                return (
                  <Link
                    key={ipo.id}
                    to={`/ipos/${ipo.id}`}
                    className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 hover:border-emerald-500/40 transition-all hover:bg-slate-800 shadow-md flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {ipo.company_name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                            {ipo.symbol} • {ipo.category}
                          </span>
                        </div>
                        <Badge variant={ipo.status}>
                          {ipo.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-slate-700/50 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Application</span>
                          <span className="font-mono font-bold text-slate-200">
                            {formatCurrency(ipo.application_amount, currencySymbol)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Allotted</span>
                          <span className="font-mono font-bold text-slate-200">
                            {allottedShares > 0 ? `${allottedShares} shares` : (ipo.status === 'not_allotted' ? '0 (Refunded)' : 'Pending')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                      <span>Bid: {currencySymbol}{ipo.bid_price}</span>
                      {hasListingPrice ? (
                        <span className={`font-mono font-bold ${listingGainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {listingGainPercent >= 0 ? `+${listingGainPercent}%` : `${listingGainPercent}%`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          {ipo.application_date}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions & Quick Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Recent Transactions
            </h2>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 shadow-md">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No recent transactions recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                          tx.transaction_type === 'buy'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {tx.transaction_type === 'buy' ? 'B' : 'S'}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{tx.symbol}</div>
                        <div className="text-[10px] text-slate-400">
                          {tx.quantity} qty @ {currencySymbol}{tx.price}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-slate-200">
                        {formatCurrency(tx.total_amount, currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-500">{tx.transaction_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asset Allocation Widget */}
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Portfolio Distribution
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  IPO Allotted Holdings
                </span>
                <span className="font-mono font-bold">
                  {formatCurrency(summary.ipoActualInvestedAmount, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Stock Holdings
                </span>
                <span className="font-mono font-bold">
                  {formatCurrency(summary.stockInvestedAmount, currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
