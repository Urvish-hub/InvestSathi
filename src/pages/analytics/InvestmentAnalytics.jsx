/**
 * InvestSathi Investment Analytics Module
 * Comprehensive portfolio performance, asset allocation, period analysis, and rankings.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchIpoApplications } from '../../services/ipoService.js';
import { fetchStockHoldings, getManualMarketPrices } from '../../services/stockService.js';
import { formatCurrency, roundTo } from '../../utils/calculations.js';
import {
    calculateComprehensiveAnalytics,
    calculateMonthlyPerformanceSeries,
    calculateYearlyPerformanceSeries,
    rankInvestmentsPerformance,
    calculateCapitalDeploymentTimeline,
} from '../../utils/analyticsCalculations.js';
import {
    exportAnalyticsPdf,
    exportTransactionsCsv,
    exportInvestmentSummaryCsv,
    exportMonthlyPerformanceCsv,
} from '../../utils/analyticsExport.js';
import {
    StatCard,
    LoadingSpinner,
    Badge,
} from '../../components/common/UIComponents.jsx';
import {
    TrendingUp,
    PieChart as PieIcon,
    BarChart3,
    Calendar,
    Download,
    FileSpreadsheet,
    FileText,
    AlertCircle,
    HelpCircle,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    Sparkles,
    ArrowUpDown,
    Filter,
    CheckCircle2,
    ChevronDown,
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';

export function InvestmentAnalytics() {
    const { user, profile } = useAuth();
    const currencySymbol = profile?.preferred_currency || '₹';

    const [ipos, setIpos] = useState([]);
    const [stockHoldings, setStockHoldings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [manualPrices, setManualPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Period Filter State
    const [filterType, setFilterType] = useState('all'); // 'all' | '2026' | '2025' | 'current_month' | 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Visualization Tab State
    const [chartTab, setChartTab] = useState('monthly'); // 'monthly' | 'yearly' | 'deployment'

    // Ranking Tab & Sort State
    const [rankingTab, setRankingTab] = useState('top'); // 'top' | 'worst' | 'all' | 'unpriced'
    const [rankingSort, setRankingSort] = useState('pnl'); // 'pnl' | 'return' | 'cost'

    // CSV Dropdown Menu
    const [showCsvMenu, setShowCsvMenu] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // Load Data
    const loadData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
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
            setManualPrices(stockData.manualPrices || getManualMarketPrices());
        } catch (err) {
            console.error('Failed to load analytics data:', err);
            setError(err.message || 'Failed to load portfolio records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    // Construct active filter object
    const activeFilter = useMemo(() => {
        const currentYear = new Date().getFullYear();
        if (filterType === 'all') return { type: 'all' };
        if (filterType === '2026') return { type: 'yearly', year: 2026 };
        if (filterType === '2025') return { type: 'yearly', year: 2025 };
        if (filterType === 'current_month') {
            const ym = new Date().toISOString().substring(0, 7);
            return { type: 'monthly', month: ym };
        }
        if (filterType === 'custom') {
            return {
                type: 'custom',
                startDate: customStartDate,
                endDate: customEndDate,
            };
        }
        return { type: 'all' };
    }, [filterType, customStartDate, customEndDate]);

    // Period label for exports and UI
    const periodLabel = useMemo(() => {
        if (filterType === 'all') return 'All Time';
        if (filterType === '2026') return 'FY 2026';
        if (filterType === '2025') return 'FY 2025';
        if (filterType === 'current_month') return 'Current Month';
        if (filterType === 'custom') {
            return `${customStartDate || 'Start'} to ${customEndDate || 'Now'}`;
        }
        return 'All Time';
    }, [filterType, customStartDate, customEndDate]);

    // Run pure calculations
    const analytics = useMemo(() => {
        return calculateComprehensiveAnalytics({
            ipos,
            stockHoldings,
            transactions,
            manualPrices,
            filter: activeFilter,
        });
    }, [ipos, stockHoldings, transactions, manualPrices, activeFilter]);

    // Monthly and yearly series
    const monthlySeries = useMemo(() => {
        return calculateMonthlyPerformanceSeries(analytics.filteredSales, transactions, ipos);
    }, [analytics.filteredSales, transactions, ipos]);

    const yearlySeries = useMemo(() => {
        return calculateYearlyPerformanceSeries(monthlySeries);
    }, [monthlySeries]);

    const deploymentTimeline = useMemo(() => {
        return calculateCapitalDeploymentTimeline(transactions, ipos);
    }, [transactions, ipos]);

    // Investment Rankings
    const { rankedInvestments, unpricedInvestments } = useMemo(() => {
        return rankInvestmentsPerformance(analytics.filteredSales, analytics.allOpenHoldings);
    }, [analytics.filteredSales, analytics.allOpenHoldings]);

    // Sorted list for Ranking Section
    const displayRankings = useMemo(() => {
        let list = [...rankedInvestments];

        if (rankingTab === 'top') {
            list = list.filter(i => i.totalPnL >= 0);
        } else if (rankingTab === 'worst') {
            list = list.filter(i => i.totalPnL < 0).reverse();
        } else if (rankingTab === 'unpriced') {
            return unpricedInvestments;
        }

        // Sort
        list.sort((a, b) => {
            if (rankingSort === 'pnl') return b.totalPnL - a.totalPnL;
            if (rankingSort === 'return') return (b.returnPercent || 0) - (a.returnPercent || 0);
            if (rankingSort === 'cost') return b.investedCost - a.investedCost;
            return b.totalPnL - a.totalPnL;
        });

        return list;
    }, [rankedInvestments, unpricedInvestments, rankingTab, rankingSort]);

    // Export Handlers
    const handleExportPdf = () => {
        try {
            setIsExportingPdf(true);
            exportAnalyticsPdf({
                analyticsData: analytics,
                monthlySeries,
                rankedInvestments,
                unpricedInvestments,
                profile,
                user,
                periodLabel,
            });
        } catch (e) {
            console.error('PDF export error:', e);
            alert('Could not export PDF. Please try again.');
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handleExportCsvTransactions = () => {
        setShowCsvMenu(false);
        exportTransactionsCsv({ transactions, periodLabel });
    };

    const handleExportCsvSummary = () => {
        setShowCsvMenu(false);
        exportInvestmentSummaryCsv({ rankedInvestments, unpricedInvestments, periodLabel });
    };

    const handleExportCsvMonthly = () => {
        setShowCsvMenu(false);
        exportMonthlyPerformanceCsv({ monthlySeries, periodLabel });
    };

    if (loading) {
        return <LoadingSpinner text="Computing investment analytics and financial scorecard..." size="lg" />;
    }

    const hasAnyData = ipos.length > 0 || transactions.length > 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-8">
            {/* 1. Header & Period Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-950/40">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                Investment Analytics
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Live
                                </span>
                            </h1>
                            <p className="text-xs text-slate-400">
                                Performance metrics, IPO vs Stock asset allocation, monthly returns, and ranking
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons: PDF & CSV Exports */}
                <div className="flex items-center gap-2.5 self-start lg:self-auto">
                    <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={isExportingPdf || !hasAnyData}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                        title="Download complete PDF financial report"
                    >
                        <Download className="w-4 h-4" />
                        <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
                    </button>

                    {/* CSV Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowCsvMenu(!showCsvMenu)}
                            disabled={!hasAnyData}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            <span>Export CSV</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        {showCsvMenu && (
                            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={handleExportCsvTransactions}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                    <span>1. Transaction Ledger</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportCsvSummary}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <BarChart3 className="w-4 h-4 text-teal-400" />
                                    <span>2. Investment Summary</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportCsvMonthly}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4 text-purple-400" />
                                    <span>3. Monthly Breakdown</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Chips Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Reporting Period:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {[
                        { id: 'all', label: 'All Time' },
                        { id: '2026', label: 'FY 2026' },
                        { id: '2025', label: 'FY 2025' },
                        { id: 'current_month', label: 'This Month' },
                        { id: 'custom', label: 'Custom Range' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setFilterType(item.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterType === item.id
                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/30'
                                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {filterType === 'custom' && (
                    <div className="w-full sm:w-auto flex items-center gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                            placeholder="From"
                        />
                        <span className="text-xs text-slate-500">to</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500"
                            placeholder="To"
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Empty State Banner if no investments at all */}
            {!hasAnyData && (
                <div className="p-8 sm:p-12 rounded-3xl bg-slate-850 border border-slate-800 text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                        <TrendingUp className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h3 className="text-lg font-bold text-white">No Investment Records Yet</h3>
                        <p className="text-xs text-slate-400">
                            Apply for IPOs or log stock buy/sell transactions to see real-time financial analytics, asset allocation charts, and tax reports.
                        </p>
                    </div>
                </div>
            )}

            {hasAnyData && (
                <>
                    {/* 4. Portfolio Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Card 1: Total Invested Amount */}
                        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 shadow-md space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Total Invested Amount
                            </span>
                            <div className="text-2xl font-black text-white tracking-tight">
                                {formatCurrency(analytics.totalInvestedAmount, currencySymbol)}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Across {analytics.totalOpenHoldingsCount} active holdings</span>
                            </div>
                        </div>

                        {/* Card 2: Current Portfolio Value */}
                        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 shadow-md space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Current Value
                                </span>
                                {analytics.totalUnpricedCount > 0 ? (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        {analytics.totalUnpricedCount} unpriced
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        100% priced
                                    </span>
                                )}
                            </div>
                            <div className="text-2xl font-black text-white tracking-tight">
                                {analytics.currentPortfolioValue !== null
                                    ? formatCurrency(analytics.currentPortfolioValue, currencySymbol)
                                    : 'Awaiting CMP'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                                {analytics.currentPortfolioValue !== null
                                    ? 'Based on current market prices'
                                    : 'Set CMP in Stock Portfolio'}
                            </div>
                        </div>

                        {/* Card 3: Realized Profit / Loss */}
                        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 shadow-md space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Realized Profit / Loss
                            </span>
                            <div
                                className={`text-2xl font-black tracking-tight flex items-center gap-1 ${analytics.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                            >
                                {analytics.realizedPnL >= 0 ? '+' : ''}
                                {formatCurrency(analytics.realizedPnL, currencySymbol)}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                {analytics.realizedPnL >= 0 ? (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                                )}
                                <span>
                                    {analytics.realizedReturnPercent >= 0 ? '+' : ''}
                                    {analytics.realizedReturnPercent}% booked return
                                </span>
                            </div>
                        </div>

                        {/* Card 4: Unrealized Profit / Loss */}
                        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 shadow-md space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Unrealized P&L
                            </span>
                            <div
                                className={`text-2xl font-black tracking-tight ${analytics.unrealizedPnL === null
                                        ? 'text-slate-400 text-lg'
                                        : analytics.unrealizedPnL >= 0
                                            ? 'text-emerald-400'
                                            : 'text-rose-400'
                                    }`}
                            >
                                {analytics.unrealizedPnL !== null
                                    ? `${analytics.unrealizedPnL >= 0 ? '+' : ''}${formatCurrency(analytics.unrealizedPnL, currencySymbol)}`
                                    : 'Awaiting CMP'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                                {analytics.unrealizedReturnPercent !== null
                                    ? `${analytics.unrealizedReturnPercent >= 0 ? '+' : ''}${roundTo(analytics.unrealizedReturnPercent)}% on open priced`
                                    : 'Missing manual CMP'}
                            </div>
                        </div>

                        {/* Card 5: Overall Return % */}
                        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 shadow-md space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Overall Return %
                            </span>
                            <div
                                className={`text-2xl font-black tracking-tight ${analytics.overallReturnPercent === null
                                        ? 'text-slate-400'
                                        : analytics.overallReturnPercent >= 0
                                            ? 'text-emerald-400'
                                            : 'text-rose-400'
                                    }`}
                            >
                                {analytics.overallReturnPercent !== null
                                    ? `${analytics.overallReturnPercent >= 0 ? '+' : ''}${analytics.overallReturnPercent}%`
                                    : 'N/A'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                                Realized + calculable gains
                            </div>
                        </div>
                    </div>

                    {/* Notice if any holding is awaiting CMP */}
                    {analytics.totalUnpricedCount > 0 && (
                        <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/30 text-cyan-200 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                                <span>
                                    <strong>Market Price Notice:</strong> {analytics.totalUnpricedCount} active holding(s) do not have a Current Market Price (CMP) entered yet. Current value reflects only priced positions.
                                </span>
                            </div>
                            <span className="text-[11px] text-cyan-400 font-bold shrink-0 hidden sm:inline">
                                Zero fake prices assumed
                            </span>
                        </div>
                    )}

                    {/* 5. IPO vs Stocks Investment Analysis Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Donut Allocation Chart */}
                        <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        <PieIcon className="w-5 h-5 text-teal-400" />
                                        Asset Allocation
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Open capital deployment by asset class
                                    </p>
                                </div>
                            </div>

                            {analytics.totalInvestedAmount > 0 ? (
                                <div className="flex flex-col items-center justify-center py-2">
                                    <div className="w-full h-56 relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analytics.allocationChartData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={85}
                                                    paddingAngle={4}
                                                >
                                                    {analytics.allocationChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderColor: '#334155',
                                                        borderRadius: '12px',
                                                        color: '#fff',
                                                        fontSize: '12px',
                                                    }}
                                                    formatter={(val) => [formatCurrency(val, currencySymbol), 'Invested Cost']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                                            <span className="text-sm font-extrabold text-white">
                                                {formatCurrency(analytics.totalInvestedAmount, currencySymbol)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Allocation Legend */}
                                    <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-750">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                                                <span>IPOs</span>
                                            </div>
                                            <div className="text-sm font-bold text-white mt-1">
                                                {formatCurrency(analytics.ipoInvested, currencySymbol)}
                                            </div>
                                            <div className="text-[11px] text-cyan-400 font-semibold">
                                                {analytics.ipoAllocationPercent}% of portfolio
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-750">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                <span>Stocks</span>
                                            </div>
                                            <div className="text-sm font-bold text-white mt-1">
                                                {formatCurrency(analytics.stockInvested, currencySymbol)}
                                            </div>
                                            <div className="text-[11px] text-emerald-400 font-semibold">
                                                {analytics.stockAllocationPercent}% of portfolio
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-xs text-slate-400">
                                    No active open holdings in this view.
                                </div>
                            )}
                        </div>

                        {/* Right: Side-by-Side Comparison Metrics */}
                        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                                    IPO vs Stock Performance Breakdown
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Comparing cost basis, realized sales profits, and open valuations
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* IPO Column */}
                                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-cyan-950/10 border border-slate-750 space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                                        <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                                            <Layers className="w-4 h-4" />
                                            IPO Applications & Allotments
                                        </span>
                                        <Badge variant="cyan" size="sm">
                                            {analytics.openIpos.length} Active
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Invested in Open Holdings:</span>
                                            <span className="font-bold text-white">{formatCurrency(analytics.ipoInvested, currencySymbol)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Current Market Valuation:</span>
                                            <span className="font-bold text-white">
                                                {analytics.ipoCurrentValue !== null ? formatCurrency(analytics.ipoCurrentValue, currencySymbol) : 'Pending CMP'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Realized Gains (Booked):</span>
                                            <span className={`font-bold ${analytics.ipoRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {analytics.ipoRealizedPnL >= 0 ? '+' : ''}{formatCurrency(analytics.ipoRealizedPnL, currencySymbol)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Unrealized P&L:</span>
                                            <span className="font-bold text-slate-300">
                                                {analytics.ipoUnrealizedPnL !== null
                                                    ? `${analytics.ipoUnrealizedPnL >= 0 ? '+' : ''}${formatCurrency(analytics.ipoUnrealizedPnL, currencySymbol)}`
                                                    : 'Pending CMP'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stock Column */}
                                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-emerald-950/10 border border-slate-750 space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                                            <TrendingUp className="w-4 h-4" />
                                            Stock Equity Positions
                                        </span>
                                        <Badge variant="emerald" size="sm">
                                            {analytics.openStocks.length} Active
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Invested in Open Holdings:</span>
                                            <span className="font-bold text-white">{formatCurrency(analytics.stockInvested, currencySymbol)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Current Market Valuation:</span>
                                            <span className="font-bold text-white">
                                                {analytics.stockCurrentValue !== null ? formatCurrency(analytics.stockCurrentValue, currencySymbol) : 'Pending CMP'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Realized Gains (Booked):</span>
                                            <span className={`font-bold ${analytics.stockRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {analytics.stockRealizedPnL >= 0 ? '+' : ''}{formatCurrency(analytics.stockRealizedPnL, currencySymbol)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-300">
                                            <span className="text-slate-400">Unrealized P&L:</span>
                                            <span className="font-bold text-slate-300">
                                                {analytics.stockUnrealizedPnL !== null
                                                    ? `${analytics.stockUnrealizedPnL >= 0 ? '+' : ''}${formatCurrency(analytics.stockUnrealizedPnL, currencySymbol)}`
                                                    : 'Pending CMP'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Deployment in Selected Period banner */}
                            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-750 flex flex-wrap items-center justify-between text-xs text-slate-300">
                                <span className="text-slate-400">Capital Deployed during {periodLabel}:</span>
                                <span className="font-extrabold text-white text-sm">
                                    {formatCurrency(analytics.periodCapitalDeployed, currencySymbol)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 6. Monthly & Yearly Profit/Loss Reports & Charts */}
                    <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-purple-400" />
                                    Financial Performance Trends
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Monthly and annual realized gains, deployed investment, and cumulative trend
                                </p>
                            </div>

                            {/* Chart Tabs */}
                            <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/80 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setChartTab('monthly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'monthly'
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Monthly P&L
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartTab('yearly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'yearly'
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Yearly Overview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartTab('deployment')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartTab === 'deployment'
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Capital Timeline
                                </button>
                            </div>
                        </div>

                        {/* Chart Render Area */}
                        <div className="w-full h-72">
                            {chartTab === 'monthly' && (
                                monthlySeries.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                                            <YAxis
                                                stroke="#94a3b8"
                                                fontSize={11}
                                                tickFormatter={(v) => `${v >= 0 ? '' : '-'}${currencySymbol}${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}k` : Math.abs(v)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    borderColor: '#334155',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                }}
                                                formatter={(val, name) => [
                                                    formatCurrency(val, currencySymbol),
                                                    name === 'realizedPnL' ? 'Realized P&L' : 'Capital Deployed',
                                                ]}
                                            />
                                            <Bar dataKey="realizedPnL" name="realizedPnL" radius={[6, 6, 0, 0]}>
                                                {monthlySeries.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.realizedPnL >= 0 ? '#10b981' : '#f43f5e'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                        No completed sales recorded in this period to display monthly P&L.
                                    </div>
                                )
                            )}

                            {chartTab === 'yearly' && (
                                yearlySeries.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={yearlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                                            <YAxis
                                                stroke="#94a3b8"
                                                fontSize={11}
                                                tickFormatter={(v) => `${currencySymbol}${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}k` : Math.abs(v)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    borderColor: '#334155',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                }}
                                                formatter={(val) => [formatCurrency(val, currencySymbol), 'Realized P&L']}
                                            />
                                            <Bar dataKey="realizedPnL" radius={[6, 6, 0, 0]}>
                                                {yearlySeries.map((entry, index) => (
                                                    <Cell
                                                        key={`year-cell-${index}`}
                                                        fill={entry.realizedPnL >= 0 ? '#10b981' : '#f43f5e'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                        No annual data recorded yet.
                                    </div>
                                )
                            )}

                            {chartTab === 'deployment' && (
                                deploymentTimeline.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={deploymentTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorDeployed" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                                            <YAxis
                                                stroke="#94a3b8"
                                                fontSize={11}
                                                tickFormatter={(v) => `${currencySymbol}${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(0)}k` : Math.abs(v)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    borderColor: '#334155',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                }}
                                                formatter={(val) => [formatCurrency(val, currencySymbol), 'Cumulative Capital Deployed']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="cumulativeDeployed"
                                                stroke="#10b981"
                                                strokeWidth={2.5}
                                                fillOpacity={1}
                                                fill="url(#colorDeployed)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                        No investments deployed yet.
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* 7. Best & Worst Performing Investments Section */}
                    <div className="p-6 rounded-3xl bg-slate-850 border border-slate-800 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    Investment Performance Ranking
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Ranked by net profit and percentage return across closed sales and valued holdings
                                </p>
                            </div>

                            {/* Controls: Segmented Tabs & Sorting */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/80">
                                    <button
                                        type="button"
                                        onClick={() => setRankingTab('top')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingTab === 'top' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Top Gainers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRankingTab('worst')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingTab === 'worst' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        Underperformers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRankingTab('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingTab === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        All Ranked
                                    </button>
                                </div>

                                {/* Sort dropdown */}
                                <select
                                    value={rankingSort}
                                    onChange={(e) => setRankingSort(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="pnl">Sort: Net Profit (INR)</option>
                                    <option value="return">Sort: Return %</option>
                                    <option value="cost">Sort: Invested Cost</option>
                                </select>
                            </div>
                        </div>

                        {/* Ranking Cards / Table */}
                        {displayRankings.length > 0 ? (
                            <div className="overflow-x-auto -mx-6 px-6">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-800/80 uppercase tracking-wider text-[10px] text-slate-400 border-b border-slate-750">
                                        <tr>
                                            <th className="py-3 px-4 rounded-l-xl">Investment</th>
                                            <th className="py-3 px-3">Type</th>
                                            <th className="py-3 px-3">Cost Basis</th>
                                            <th className="py-3 px-3">Realized P&L</th>
                                            <th className="py-3 px-3">Total Net P&L</th>
                                            <th className="py-3 px-3">Return %</th>
                                            <th className="py-3 px-4 rounded-r-xl">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-medium">
                                        {displayRankings.map((item, idx) => {
                                            const isProfit = item.totalPnL >= 0;
                                            return (
                                                <tr key={item.key || idx} className="hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold text-white text-sm">{item.companyName}</div>
                                                        <div className="text-[11px] text-slate-400 font-mono">{item.symbol}</div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <Badge variant={item.assetType === 'ipo' ? 'cyan' : 'emerald'} size="sm">
                                                            {item.assetType.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-3 font-semibold text-white">
                                                        {formatCurrency(item.investedCost, currencySymbol)}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={item.realizedPnL >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                                            {item.realizedPnL >= 0 ? '+' : ''}{formatCurrency(item.realizedPnL, currencySymbol)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={`font-black text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {isProfit ? '+' : ''}{formatCurrency(item.totalPnL, currencySymbol)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {item.returnPercent !== null ? (
                                                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                                }`}>
                                                                {isProfit ? '+' : ''}{item.returnPercent}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 font-normal">Awaiting CMP</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {item.hasOpenPosition ? (
                                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                                                                Open Position
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
                                                                Fully Closed
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-xs text-slate-400">
                                No investment positions matched the selected ranking category.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
