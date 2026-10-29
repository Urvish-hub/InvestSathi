import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchIpoApplications } from '../../services/ipoService.js';
import { fetchStockHoldings } from '../../services/stockService.js';
import { formatCurrency, roundTo } from '../../utils/calculations.js';
import {
  StatCard,
  LoadingSpinner,
} from '../../components/common/UIComponents.jsx';
import {
  FileBarChart2,
  Download,
  Award,
  Layers,
  TrendingUp,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export function Reports() {
  const { user, profile } = useAuth();
  const currencySymbol = profile?.preferred_currency || '₹';

  const [ipos, setIpos] = useState([]);
  const [stockHoldings, setStockHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Financial Year Selector (e.g. FY 2026-27, FY 2025-26, All Time)
  const [selectedFy, setSelectedFy] = useState('all');

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        const [ipoList, stockData] = await Promise.all([
          fetchIpoApplications(user.id),
          fetchStockHoldings(user.id),
        ]);
        setIpos(ipoList || []);
        setStockHoldings(stockData.holdings || []);
        setTransactions(stockData.transactions || []);
      } catch (err) {
        setError(err.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // IPO Performance Analytics
  const totalIposApplied = ipos.length;
  const allottedIpos = ipos.filter(
    (i) => i.status === 'allotted' || i.status === 'listed' || (i.allotment?.allotted_shares > 0)
  );
  const notAllottedIpos = ipos.filter((i) => i.status === 'not_allotted');
  const winRate = totalIposApplied > 0 ? roundTo((allottedIpos.length / totalIposApplied) * 100) : 0;

  const totalApplicationBids = ipos.reduce((sum, i) => sum + (Number(i.application_amount) || 0), 0);
  const totalAllottedCost = ipos.reduce((sum, i) => sum + (Number(i.allotment?.allotted_amount) || 0), 0);
  const totalRefundAmount = ipos.reduce((sum, i) => sum + (Number(i.allotment?.refund_amount) || 0), 0);
  const totalIpoRealizedProfit = ipos.reduce((sum, i) => sum + (i.salesSummary?.totalRealizedPnL || 0), 0);

  // Stock Performance Analytics
  const totalStockRealizedProfit = stockHoldings.reduce((sum, h) => sum + (h.realizedPnL || 0), 0);
  const grandRealizedProfit = totalIpoRealizedProfit + totalStockRealizedProfit;

  // Capital Gains Estimation (STCG vs LTCG based on 365-day holding period)
  // For IPO sales, holding period is usually < 1 year (STCG)
  // For Stocks, check trade dates
  let stcgProfits = totalIpoRealizedProfit; // IPOs almost always short-term listing gains
  let ltcgProfits = 0;

  // Categorize stock sales
  for (const h of stockHoldings) {
    if (h.realizedPnL > 0) {
      // For simple estimation: if first buy date was > 1 yr ago
      const buyDates = h.transactions.filter(t => t.transaction_type === 'buy').map(t => new Date(t.transaction_date));
      const earliestBuy = buyDates.length ? new Date(Math.min(...buyDates)) : new Date();
      const diffDays = (new Date() - earliestBuy) / (1000 * 60 * 60 * 24);

      if (diffDays >= 365) {
        ltcgProfits += h.realizedPnL;
      } else {
        stcgProfits += h.realizedPnL;
      }
    }
  }

  // Export Complete Report
  const handleExportReport = () => {
    const reportData = {
      investor: profile?.full_name || user?.email,
      reportGeneratedAt: new Date().toISOString(),
      ipoMetrics: {
        totalApplied: totalIposApplied,
        totalAllotted: allottedIpos.length,
        winRatePercent: winRate,
        totalBidsValue: totalApplicationBids,
        totalInvestedCapital: totalAllottedCost,
        totalRefundReleased: totalRefundAmount,
        totalIpoRealizedGains: totalIpoRealizedProfit,
      },
      stockMetrics: {
        totalRealizedGains: totalStockRealizedProfit,
        holdingsCount: stockHoldings.filter(h => h.isActiveHolding).length,
      },
      grandTotalRealizedPnL: grandRealizedProfit,
      taxEstimates: {
        shortTermGainsEst: stcgProfits,
        longTermGainsEst: ltcgProfits,
      },
      ipoDetails: ipos,
      stockHoldings,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `InvestSathi_Financial_Report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingSpinner text="Compiling financial scorecard and tax reports..." size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-6 h-6 text-purple-400" />
            Performance Reports & Scorecard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            IPO strike rates, capital deployment efficiency, and tax estimations
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/40 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export Full JSON Report</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Realized Profit Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-850 via-slate-800 to-emerald-950/40 border border-slate-750 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Realized Net Profits (IPOs + Stocks)
          </span>
          <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-tight">
            {formatCurrency(grandRealizedProfit, currencySymbol)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>IPO Gains: {formatCurrency(totalIpoRealizedProfit, currencySymbol)}</span>
            <span>•</span>
            <span>Stock Gains: {formatCurrency(totalStockRealizedProfit, currencySymbol)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">IPO Allotment Rate</span>
            <span className="font-mono text-2xl font-black text-emerald-400">{winRate}%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total IPO Bids</span>
            <span className="font-mono text-2xl font-black text-purple-400">{totalIposApplied}</span>
          </div>
        </div>
      </div>

      {/* Section 1: IPO Performance Scorecard */}
      <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          IPO Allotment & Capital Allocation Scorecard
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-750">
            <span className="text-[10px] text-slate-400 block uppercase">Total ASBA Blocked</span>
            <span className="font-mono text-base font-bold text-white">
              {formatCurrency(totalApplicationBids, currencySymbol)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-750">
            <span className="text-[10px] text-slate-400 block uppercase">Actual Allotted Cost</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {formatCurrency(totalAllottedCost, currencySymbol)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-750">
            <span className="text-[10px] text-slate-400 block uppercase">Refund Unblocked</span>
            <span className="font-mono text-base font-bold text-slate-200">
              {formatCurrency(totalRefundAmount, currencySymbol)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-750">
            <span className="text-[10px] text-slate-400 block uppercase">Net IPO Gain</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              +{formatCurrency(totalIpoRealizedProfit, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Breakdown by IPO */}
        <div className="pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            IPO Application Breakdown
          </span>
          {ipos.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">No IPO applications recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-750 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Bid Date</th>
                    <th className="py-2.5 px-3 text-right">Applied</th>
                    <th className="py-2.5 px-3 text-right">Allotted</th>
                    <th className="py-2.5 px-3 text-right">Listing Day Gain</th>
                    <th className="py-2.5 px-3 text-right">Realized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-750/50 font-mono">
                  {ipos.map((ipo) => {
                    const allottedShares = ipo.allotment?.allotted_shares || 0;
                    const listingPrice = ipo.allotment?.listing_price;
                    const gainAmt = listingPrice && allottedShares > 0
                      ? (listingPrice - ipo.bid_price) * allottedShares
                      : null;
                    const realized = ipo.salesSummary?.totalRealizedPnL || 0;

                    return (
                      <tr key={ipo.id} className="hover:bg-slate-750/30">
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          {ipo.company_name} ({ipo.symbol})
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">
                          {ipo.application_date}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatCurrency(ipo.application_amount, currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {allottedShares > 0 ? (
                            <span className="text-emerald-400 font-bold">{allottedShares} shs</span>
                          ) : ipo.status === 'not_allotted' ? (
                            <span className="text-rose-400">0 (Refunded)</span>
                          ) : (
                            <span className="text-slate-500 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {gainAmt !== null ? (
                            <span className={gainAmt >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {gainAmt >= 0 ? '+' : ''}{formatCurrency(gainAmt, currencySymbol)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {realized !== 0 ? (
                            <span className={realized >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {realized >= 0 ? '+' : ''}{formatCurrency(realized, currencySymbol)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Capital Gains Tax Estimation */}
      <div className="bg-slate-800/80 border border-slate-750 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Capital Gains Summary & Tax Classification
          </h2>
          <span className="text-[11px] text-slate-400">Standard 1-Year Holding Period Rule</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-750 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase">
                Short-Term Capital Gains (STCG)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                &lt; 365 Days
              </span>
            </div>
            <div className="font-mono text-xl font-bold text-white">
              {formatCurrency(stcgProfits, currencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400">
              Includes IPO listing day gains and stock positions sold within 12 months.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-750 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase">
                Long-Term Capital Gains (LTCG)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                ≥ 365 Days
              </span>
            </div>
            <div className="font-mono text-xl font-bold text-white">
              {formatCurrency(ltcgProfits, currencySymbol)}
            </div>
            <p className="text-[11px] text-slate-400">
              Profits from equity investments held longer than 1 year.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          * Note: This report provides mathematical calculations based on logged execution dates and prices for your personal records. For official tax filing, please consult a certified Chartered Accountant or tax advisor.
        </div>
      </div>
    </div>
  );
}
