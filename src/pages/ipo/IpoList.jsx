import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchIpoApplications } from '../../services/ipoService.js';
import { formatCurrency, roundTo } from '../../utils/calculations.js';
import { Badge, LoadingSpinner, EmptyState } from '../../components/common/UIComponents.jsx';
import {
  Layers,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export function IpoList() {
  const { user, profile } = useAuth();
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currencySymbol = profile?.preferred_currency || '₹';

  const loadIpos = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchIpoApplications(user.id);
      setIpos(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load IPO applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIpos();
  }, [user]);

  // Filter logic
  const filteredIpos = ipos.filter((ipo) => {
    const matchesTab = activeTab === 'all' || ipo.status === activeTab;
    const matchesCategory = categoryFilter === 'all' || ipo.category === categoryFilter;
    const matchesSearch =
      ipo.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ipo.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesCategory && matchesSearch;
  });

  const tabCounts = {
    all: ipos.length,
    applied: ipos.filter((i) => i.status === 'applied').length,
    allotted: ipos.filter((i) => i.status === 'allotted').length,
    not_allotted: ipos.filter((i) => i.status === 'not_allotted').length,
    listed: ipos.filter((i) => i.status === 'listed').length,
    closed: ipos.filter((i) => i.status === 'closed').length,
  };

  if (loading) {
    return <LoadingSpinner text="Loading IPO records..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            IPO Applications & Listings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Track bids, ASBA funds, allotment results, and listing day performance
          </p>
        </div>
        <Link
          to="/ipos/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for IPO</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or ticker symbol..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="retail">Retail (RII)</option>
            <option value="hni">HNI (sHNI / bHNI)</option>
            <option value="shareholder">Shareholder</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
        {[
          { key: 'all', label: 'All' },
          { key: 'applied', label: 'Applied' },
          { key: 'allotted', label: 'Allotted' },
          { key: 'not_allotted', label: 'Not Allotted' },
          { key: 'listed', label: 'Listed' },
          { key: 'closed', label: 'Closed' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === tab.key ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {tabCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* List Grid */}
      {filteredIpos.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No IPOs Found"
          description={
            searchQuery || activeTab !== 'all' || categoryFilter !== 'all'
              ? 'No IPO applications match your current filters.'
              : 'You have not added any IPO applications yet.'
          }
          actionText="+ Apply for IPO"
          onAction={() => window.location.assign('/ipos/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIpos.map((ipo) => {
            const allottedShares = ipo.allotment?.allotted_shares || 0;
            const listingPrice = ipo.allotment?.listing_price;
            const listingGainPercent = listingPrice
              ? roundTo(((listingPrice - ipo.bid_price) / ipo.bid_price) * 100)
              : null;
            const remainingShares = ipo.salesSummary?.remainingShares ?? allottedShares;

            return (
              <div
                key={ipo.id}
                className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-base text-white tracking-tight line-clamp-1">
                        {ipo.company_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-semibold text-emerald-400">
                          {ipo.symbol}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium capitalize">
                          • {ipo.category}
                        </span>
                      </div>
                    </div>
                    <Badge variant={ipo.status}>
                      {ipo.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Financial Metrics */}
                  <div className="my-3 py-3 border-y border-slate-750/80 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-medium">
                        Bid / Application
                      </span>
                      <span className="font-mono font-bold text-slate-200">
                        {currencySymbol}{ipo.bid_price} ({ipo.total_shares_applied} shs)
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        Total: {formatCurrency(ipo.application_amount, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-medium">
                        Allotment
                      </span>
                      {allottedShares > 0 ? (
                        <div>
                          <span className="font-mono font-bold text-emerald-400">
                            {allottedShares} shares allotted
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            Cost: {formatCurrency(ipo.allotment.allotted_amount, currencySymbol)}
                          </span>
                        </div>
                      ) : ipo.status === 'not_allotted' ? (
                        <div>
                          <span className="font-mono font-bold text-rose-400">
                            0 Shares Allotted
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Refund: {formatCurrency(ipo.application_amount, currencySymbol)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400 italic">
                          Awaiting result
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Listing Gain / Sales info */}
                  {listingPrice && (
                    <div className="mb-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-750 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Listing Price</span>
                        <span className="font-mono font-bold text-slate-200">
                          {currencySymbol}{listingPrice}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Listing Gain</span>
                        <span
                          className={`font-mono font-bold ${
                            listingGainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {listingGainPercent >= 0 ? `+${listingGainPercent}%` : `${listingGainPercent}%`}
                        </span>
                      </div>
                    </div>
                  )}

                  {ipo.salesSummary && ipo.salesSummary.totalSoldShares > 0 && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                      <span className="text-slate-300">
                        Sold {ipo.salesSummary.totalSoldShares} shs ({remainingShares} left)
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{formatCurrency(ipo.salesSummary.totalRealizedPnL, currencySymbol)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-750/50">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {ipo.application_date}
                  </span>
                  <Link
                    to={`/ipos/${ipo.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    <span>View & Manage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
