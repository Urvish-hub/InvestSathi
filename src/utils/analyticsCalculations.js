/**
 * InvestSathi Financial Analytics & Performance Calculation Engine
 * 
 * Pure, decimal-safe financial formulas for portfolio analytics,
 * period-based performance metrics, asset allocation, and investment rankings.
 */
import { roundTo } from './calculations.js';

/**
 * Normalizes a date string to YYYY-MM-DD format.
 * @param {string | Date} dateInput
 * @returns {string} YYYY-MM-DD
 */
export function normalizeDate(dateInput) {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
        return dateInput.split('T')[0];
    }
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        return dateInput.toISOString().split('T')[0];
    }
    return '';
}

/**
 * Checks whether a given transaction or event date falls within the filter range.
 * 
 * @param {string} itemDate - YYYY-MM-DD
 * @param {{ type: string, year?: number, month?: string, startDate?: string, endDate?: string }} filter
 * @returns {boolean}
 */
export function isDateInPeriod(itemDate, filter) {
    if (!itemDate) return false;
    if (!filter || filter.type === 'all') return true;

    const dateStr = normalizeDate(itemDate);
    if (!dateStr) return false;

    const [yearStr, monthStr] = dateStr.split('-');
    const itemYear = parseInt(yearStr, 10);
    const itemMonth = `${yearStr}-${monthStr}`;

    if (filter.type === 'yearly') {
        if (!filter.year) return true;
        return itemYear === Number(filter.year);
    }

    if (filter.type === 'monthly') {
        if (!filter.month) return true;
        return itemMonth === filter.month; // e.g. "2026-09"
    }

    if (filter.type === 'custom') {
        if (filter.startDate && dateStr < filter.startDate) return false;
        if (filter.endDate && dateStr > filter.endDate) return false;
        return true;
    }

    return true;
}

/**
 * Extracts all individual sell executions from both stocks and IPO sales.
 * Each sale has: symbol, companyName, assetType, date, qty, sellPrice, costBasis, proceeds, charges, realizedPnL.
 * 
 * @param {Array<object>} ipos - IPO records with allotment and sales
 * @param {Array<object>} stockTransactions - Unified transactions
 * @returns {Array<object>} List of closed/sold lots
 */
export function extractCompletedSales(ipos = [], stockTransactions = []) {
    const completedSales = [];

    // 1. Stock Sales (calculate cost basis using chronological weighted average)
    const stockBySymbol = {};
    const sortedStockTx = [...stockTransactions]
        .filter(t => t.asset_type === 'stock')
        .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    for (const tx of sortedStockTx) {
        const sym = (tx.symbol || '').toUpperCase().trim();
        if (!sym) continue;

        if (!stockBySymbol[sym]) {
            stockBySymbol[sym] = {
                totalBuyQty: 0,
                totalBuyAmount: 0,
            };
        }

        const state = stockBySymbol[sym];
        const qty = Math.max(0, parseInt(tx.quantity, 10) || 0);
        const price = Math.max(0, Number(tx.price) || 0);
        const charges = Math.max(0, Number(tx.brokerage_charges) || 0);
        const grossAmount = roundTo(qty * price);

        if (tx.transaction_type === 'buy') {
            state.totalBuyQty += qty;
            state.totalBuyAmount += (grossAmount + charges);
        } else if (tx.transaction_type === 'sell') {
            const avgCost = state.totalBuyQty > 0 ? (state.totalBuyAmount / state.totalBuyQty) : 0;
            const costBasis = roundTo(avgCost * qty);
            const netProceeds = roundTo(grossAmount - charges);
            const realizedPnL = roundTo(netProceeds - costBasis);
            const returnPercent = costBasis > 0 ? roundTo((realizedPnL / costBasis) * 100) : 0;

            completedSales.push({
                id: tx.id || `stock-sale-${Math.random()}`,
                assetType: 'stock',
                symbol: sym,
                companyName: tx.company_name || sym,
                transactionDate: normalizeDate(tx.transaction_date),
                quantity: qty,
                price,
                costBasis,
                netProceeds,
                brokerageCharges: charges,
                realizedPnL,
                returnPercent,
                notes: tx.notes || '',
            });

            state.totalBuyQty = Math.max(0, state.totalBuyQty - qty);
            state.totalBuyAmount = Math.max(0, state.totalBuyAmount - costBasis);
        }
    }

    // 2. IPO Sales
    for (const ipo of ipos) {
        const bidPrice = Math.max(0, Number(ipo.bid_price) || 0);
        const sales = ipo.sales || [];

        for (const sale of sales) {
            const qty = Math.max(0, parseInt(sale.quantity, 10) || 0);
            const salePrice = Math.max(0, Number(sale.price) || 0);
            const charges = Math.max(0, Number(sale.brokerage_charges) || 0);
            const grossAmount = roundTo(qty * salePrice);
            const costBasis = roundTo(qty * bidPrice);
            const netProceeds = roundTo(grossAmount - charges);
            const realizedPnL = roundTo(netProceeds - costBasis);
            const returnPercent = costBasis > 0 ? roundTo((realizedPnL / costBasis) * 100) : 0;

            completedSales.push({
                id: sale.id || `ipo-sale-${Math.random()}`,
                assetType: 'ipo',
                symbol: (ipo.symbol || '').toUpperCase().trim(),
                companyName: ipo.company_name || ipo.symbol,
                transactionDate: normalizeDate(sale.transaction_date || ipo.allotment?.listing_date),
                quantity: qty,
                price: salePrice,
                costBasis,
                netProceeds,
                brokerageCharges: charges,
                realizedPnL,
                returnPercent,
                notes: sale.notes || '',
            });
        }
    }

    // Sort by date descending
    return completedSales.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
}

/**
 * Calculates open active holdings for both Stocks and IPOs.
 * 
 * @param {Array<object>} ipos - IPO applications with allotment info
 * @param {Array<object>} stockHoldings - Pre-calculated stock holdings
 * @param {Record<string, number>} manualPrices - Map of symbol -> market price
 * @returns {{ openIpos: Array<object>, openStocks: Array<object>, allOpen: Array<object> }}
 */
export function getActiveHoldings(ipos = [], stockHoldings = [], manualPrices = {}) {
    const openIpos = [];
    const openStocks = [];

    // Active open IPO positions
    for (const ipo of ipos) {
        if (!ipo.allotment || Number(ipo.allotment.allotted_shares) <= 0) continue;

        const allottedShares = Number(ipo.allotment.allotted_shares) || 0;
        const bidPrice = Number(ipo.bid_price) || 0;
        const soldShares = (ipo.sales || []).reduce((sum, s) => sum + (parseInt(s.quantity, 10) || 0), 0);
        const remainingShares = Math.max(0, allottedShares - soldShares);

        if (remainingShares > 0) {
            const sym = (ipo.symbol || '').toUpperCase().trim();
            const investedCost = roundTo(remainingShares * bidPrice);

            // Determine market price: manual CMP first, then listing_price from allotment, otherwise null
            let cmp = null;
            if (manualPrices[sym] !== undefined && !isNaN(Number(manualPrices[sym]))) {
                cmp = Number(manualPrices[sym]);
            } else if (ipo.allotment.listing_price && Number(ipo.allotment.listing_price) > 0) {
                cmp = Number(ipo.allotment.listing_price);
            }

            let currentValue = null;
            let unrealizedPnL = null;
            let unrealizedPnLPercent = null;

            if (cmp !== null && cmp >= 0) {
                currentValue = roundTo(remainingShares * cmp);
                unrealizedPnL = roundTo(currentValue - investedCost);
                unrealizedPnLPercent = investedCost > 0 ? roundTo((unrealizedPnL / investedCost) * 100) : 0;
            }

            openIpos.push({
                id: ipo.id,
                assetType: 'ipo',
                symbol: sym,
                companyName: ipo.company_name || sym,
                quantity: remainingShares,
                allottedShares,
                soldShares,
                avgCostPerShare: bidPrice,
                investedValue: investedCost,
                currentPrice: cmp,
                currentValue,
                unrealizedPnL,
                unrealizedPnLPercent,
                hasCmp: cmp !== null,
                entryDate: ipo.allotment.allotment_date || ipo.application_date,
            });
        }
    }

    // Active open Stock positions
    for (const h of stockHoldings) {
        if (h.isActiveHolding && h.quantity > 0) {
            openStocks.push({
                assetType: 'stock',
                symbol: h.symbol,
                companyName: h.companyName,
                quantity: h.quantity,
                avgCostPerShare: h.avgCostPerShare,
                investedValue: h.investedValue,
                currentPrice: h.manualPrice,
                currentValue: h.currentValue,
                unrealizedPnL: h.unrealizedPnL,
                unrealizedPnLPercent: h.unrealizedPnLPercent,
                hasCmp: h.manualPrice !== null && !isNaN(h.manualPrice),
                entryDate: h.transactions?.[0]?.transaction_date || '',
            });
        }
    }

    return {
        openIpos,
        openStocks,
        allOpen: [...openIpos, ...openStocks],
    };
}

/**
 * Aggregates complete Analytics Overview according to strict financial guidelines.
 * 
 * @param {object} params
 * @param {Array<object>} params.ipos
 * @param {Array<object>} params.stockHoldings
 * @param {Array<object>} params.transactions
 * @param {Record<string, number>} params.manualPrices
 * @param {object} params.filter - { type: 'all' | 'yearly' | 'monthly' | 'custom', ... }
 * @returns {object} Analytics metrics
 */
export function calculateComprehensiveAnalytics({
    ipos = [],
    stockHoldings = [],
    transactions = [],
    manualPrices = {},
    filter = { type: 'all' },
}) {
    const allSales = extractCompletedSales(ipos, transactions);
    const { openIpos, openStocks, allOpen } = getActiveHoldings(ipos, stockHoldings, manualPrices);

    // Filter sales for the selected period
    const filteredSales = allSales.filter(sale => isDateInPeriod(sale.transactionDate, filter));

    // Period Realized P&L
    let realizedPnL = 0;
    let realizedCostBasis = 0;
    let realizedProceeds = 0;
    let realizedBrokerage = 0;
    let ipoRealizedPnL = 0;
    let stockRealizedPnL = 0;

    for (const sale of filteredSales) {
        realizedPnL += sale.realizedPnL;
        realizedCostBasis += sale.costBasis;
        realizedProceeds += sale.netProceeds;
        realizedBrokerage += sale.brokerageCharges;

        if (sale.assetType === 'ipo') {
            ipoRealizedPnL += sale.realizedPnL;
        } else {
            stockRealizedPnL += sale.realizedPnL;
        }
    }

    realizedPnL = roundTo(realizedPnL);
    realizedCostBasis = roundTo(realizedCostBasis);
    realizedProceeds = roundTo(realizedProceeds);
    realizedBrokerage = roundTo(realizedBrokerage);
    ipoRealizedPnL = roundTo(ipoRealizedPnL);
    stockRealizedPnL = roundTo(stockRealizedPnL);

    // Capital Deployed in Selected Period
    // For stocks: all buy transactions within period
    // For IPOs: allotted IPO amounts whose allotment_date is within period
    let periodCapitalDeployed = 0;
    let periodBuyCount = 0;

    for (const tx of transactions) {
        if (tx.asset_type === 'stock' && tx.transaction_type === 'buy') {
            if (isDateInPeriod(tx.transaction_date, filter)) {
                periodCapitalDeployed += Number(tx.total_amount) || 0;
                periodBuyCount++;
            }
        }
    }

    for (const ipo of ipos) {
        if (ipo.allotment && Number(ipo.allotment.allotted_amount) > 0) {
            const allotDate = ipo.allotment.allotment_date || ipo.application_date;
            if (isDateInPeriod(allotDate, filter)) {
                periodCapitalDeployed += Number(ipo.allotment.allotted_amount) || 0;
                periodBuyCount++;
            }
        }
    }

    periodCapitalDeployed = roundTo(periodCapitalDeployed);

    // Open Portfolio Valuation (Open holdings are current state)
    let ipoOpenInvested = 0;
    let ipoOpenCurrentValue = 0;
    let ipoOpenPricedInvested = 0;
    let ipoOpenUnrealizedPnL = 0;
    let ipoUnpricedCount = 0;

    for (const item of openIpos) {
        ipoOpenInvested += item.investedValue;
        if (item.hasCmp && item.currentValue !== null) {
            ipoOpenCurrentValue += item.currentValue;
            ipoOpenPricedInvested += item.investedValue;
            ipoOpenUnrealizedPnL += item.unrealizedPnL;
        } else {
            ipoUnpricedCount++;
        }
    }

    let stockOpenInvested = 0;
    let stockOpenCurrentValue = 0;
    let stockOpenPricedInvested = 0;
    let stockOpenUnrealizedPnL = 0;
    let stockUnpricedCount = 0;

    for (const item of openStocks) {
        stockOpenInvested += item.investedValue;
        if (item.hasCmp && item.currentValue !== null) {
            stockOpenCurrentValue += item.currentValue;
            stockOpenPricedInvested += item.investedValue;
            stockOpenUnrealizedPnL += item.unrealizedPnL;
        } else {
            stockUnpricedCount++;
        }
    }

    ipoOpenInvested = roundTo(ipoOpenInvested);
    stockOpenInvested = roundTo(stockOpenInvested);
    const totalOpenInvested = roundTo(ipoOpenInvested + stockOpenInvested);

    const totalUnpricedCount = ipoUnpricedCount + stockUnpricedCount;
    const isPortfolioFullyValued = allOpen.length > 0 && totalUnpricedCount === 0;

    let currentPortfolioValue = null;
    let totalUnrealizedPnL = null;
    let unrealizedReturnPercent = null;

    if (allOpen.length > 0) {
        const valuedInvested = ipoOpenPricedInvested + stockOpenPricedInvested;
        const valuedCurrent = ipoOpenCurrentValue + stockOpenCurrentValue;

        // Only calculate portfolio value if at least some positions have valid prices
        if (totalUnpricedCount < allOpen.length) {
            currentPortfolioValue = roundTo(valuedCurrent);
            totalUnrealizedPnL = roundTo(valuedCurrent - valuedInvested);
            unrealizedReturnPercent = valuedInvested > 0 ? roundTo((totalUnrealizedPnL / valuedInvested) * 100) : 0;
        }
    } else {
        currentPortfolioValue = 0;
        totalUnrealizedPnL = 0;
        unrealizedReturnPercent = 0;
    }

    // Overall Total Return Percentage:
    // (Realized PnL + Calculable Unrealized PnL) / (Realized Cost Basis + Open Priced Cost Basis) * 100
    let overallReturnPercent = null;
    const combinedCostBasis = realizedCostBasis + (ipoOpenPricedInvested + stockOpenPricedInvested);
    if (combinedCostBasis > 0) {
        const combinedPnL = realizedPnL + (totalUnrealizedPnL || 0);
        overallReturnPercent = roundTo((combinedPnL / combinedCostBasis) * 100);
    }

    // Asset Allocation (IPO vs Stocks)
    const ipoAllocationPercent = totalOpenInvested > 0 ? roundTo((ipoOpenInvested / totalOpenInvested) * 100) : 0;
    const stockAllocationPercent = totalOpenInvested > 0 ? roundTo((stockOpenInvested / totalOpenInvested) * 100) : 0;

    const allocationChartData = [
        { name: 'IPO Holdings', value: ipoOpenInvested, percentage: ipoAllocationPercent, color: '#06b6d4' },
        { name: 'Stock Holdings', value: stockOpenInvested, percentage: stockAllocationPercent, color: '#10b981' },
    ].filter(item => item.value > 0);

    return {
        // 1. Overview Cards
        totalInvestedAmount: totalOpenInvested,
        currentPortfolioValue,
        realizedPnL,
        unrealizedPnL: totalUnrealizedPnL,
        overallReturnPercent,
        realizedReturnPercent: realizedCostBasis > 0 ? roundTo((realizedPnL / realizedCostBasis) * 100) : 0,
        unrealizedReturnPercent,

        // Status / Disclaimers
        isPortfolioFullyValued,
        totalUnpricedCount,
        totalOpenHoldingsCount: allOpen.length,

        // 2. IPO vs Stock Breakdown
        ipoInvested: ipoOpenInvested,
        stockInvested: stockOpenInvested,
        ipoCurrentValue: ipoOpenCurrentValue > 0 ? roundTo(ipoOpenCurrentValue) : null,
        stockCurrentValue: stockOpenCurrentValue > 0 ? roundTo(stockOpenCurrentValue) : null,
        ipoRealizedPnL,
        stockRealizedPnL,
        ipoUnrealizedPnL: (openIpos.length - ipoUnpricedCount) > 0 ? roundTo(ipoOpenUnrealizedPnL) : null,
        stockUnrealizedPnL: (openStocks.length - stockUnpricedCount) > 0 ? roundTo(stockOpenUnrealizedPnL) : null,
        ipoAllocationPercent,
        stockAllocationPercent,
        allocationChartData,

        // 3. Period Metrics
        periodCapitalDeployed,
        periodSalesProceeds: realizedProceeds,
        periodBrokerageCharges: realizedBrokerage,
        periodTransactionCount: filteredSales.length + periodBuyCount,
        periodSalesCount: filteredSales.length,
        periodBuyCount,

        // Raw datasets for subcomponents
        filteredSales,
        allOpenHoldings: allOpen,
        openIpos,
        openStocks,
    };
}

/**
 * Computes Monthly Profit/Loss and Transaction Volume series for charts.
 * 
 * @param {Array<object>} allSales - Output from extractCompletedSales
 * @param {Array<object>} transactions - All transactions
 * @param {Array<object>} ipos - IPOs
 * @returns {Array<object>} Array of monthly aggregated records
 */
export function calculateMonthlyPerformanceSeries(allSales = [], transactions = [], ipos = []) {
    const monthMap = {};

    // 1. Aggregate Sales by Month
    for (const sale of allSales) {
        if (!sale.transactionDate) continue;
        const monthKey = sale.transactionDate.substring(0, 7); // "YYYY-MM"

        if (!monthMap[monthKey]) {
            monthMap[monthKey] = {
                month: monthKey,
                realizedPnL: 0,
                ipoRealizedPnL: 0,
                stockRealizedPnL: 0,
                salesProceeds: 0,
                capitalDeployed: 0,
                salesCount: 0,
                buysCount: 0,
            };
        }

        const m = monthMap[monthKey];
        m.realizedPnL += sale.realizedPnL;
        m.salesProceeds += sale.netProceeds;
        m.salesCount++;

        if (sale.assetType === 'ipo') {
            m.ipoRealizedPnL += sale.realizedPnL;
        } else {
            m.stockRealizedPnL += sale.realizedPnL;
        }
    }

    // 2. Aggregate Buys / Allotments by Month
    for (const tx of transactions) {
        if (tx.asset_type === 'stock' && tx.transaction_type === 'buy' && tx.transaction_date) {
            const monthKey = tx.transaction_date.substring(0, 7);
            if (!monthMap[monthKey]) {
                monthMap[monthKey] = {
                    month: monthKey,
                    realizedPnL: 0,
                    ipoRealizedPnL: 0,
                    stockRealizedPnL: 0,
                    salesProceeds: 0,
                    capitalDeployed: 0,
                    salesCount: 0,
                    buysCount: 0,
                };
            }
            monthMap[monthKey].capitalDeployed += Number(tx.total_amount) || 0;
            monthMap[monthKey].buysCount++;
        }
    }

    for (const ipo of ipos) {
        if (ipo.allotment && Number(ipo.allotment.allotted_amount) > 0) {
            const allotDate = ipo.allotment.allotment_date || ipo.application_date;
            if (allotDate) {
                const monthKey = allotDate.substring(0, 7);
                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = {
                        month: monthKey,
                        realizedPnL: 0,
                        ipoRealizedPnL: 0,
                        stockRealizedPnL: 0,
                        salesProceeds: 0,
                        capitalDeployed: 0,
                        salesCount: 0,
                        buysCount: 0,
                    };
                }
                monthMap[monthKey].capitalDeployed += Number(ipo.allotment.allotted_amount) || 0;
                monthMap[monthKey].buysCount++;
            }
        }
    }

    // Sort chronologically
    const result = Object.values(monthMap)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => ({
            ...item,
            realizedPnL: roundTo(item.realizedPnL),
            ipoRealizedPnL: roundTo(item.ipoRealizedPnL),
            stockRealizedPnL: roundTo(item.stockRealizedPnL),
            salesProceeds: roundTo(item.salesProceeds),
            capitalDeployed: roundTo(item.capitalDeployed),
            totalTransactions: item.salesCount + item.buysCount,
            // Format month label: "2026-08" -> "Aug '26"
            label: formatMonthLabel(item.month),
        }));

    return result;
}

/**
 * Computes Yearly Profit/Loss series for charts.
 * 
 * @param {Array<object>} monthlySeries
 * @returns {Array<object>}
 */
export function calculateYearlyPerformanceSeries(monthlySeries = []) {
    const yearMap = {};

    for (const m of monthlySeries) {
        const yearKey = m.month.substring(0, 4);

        if (!yearMap[yearKey]) {
            yearMap[yearKey] = {
                year: yearKey,
                label: `FY ${yearKey}`,
                realizedPnL: 0,
                ipoRealizedPnL: 0,
                stockRealizedPnL: 0,
                salesProceeds: 0,
                capitalDeployed: 0,
                totalTransactions: 0,
            };
        }

        const y = yearMap[yearKey];
        y.realizedPnL += m.realizedPnL;
        y.ipoRealizedPnL += m.ipoRealizedPnL;
        y.stockRealizedPnL += m.stockRealizedPnL;
        y.salesProceeds += m.salesProceeds;
        y.capitalDeployed += m.capitalDeployed;
        y.totalTransactions += m.totalTransactions;
    }

    return Object.values(yearMap)
        .sort((a, b) => a.year.localeCompare(b.year))
        .map(item => ({
            ...item,
            realizedPnL: roundTo(item.realizedPnL),
            ipoRealizedPnL: roundTo(item.ipoRealizedPnL),
            stockRealizedPnL: roundTo(item.stockRealizedPnL),
            salesProceeds: roundTo(item.salesProceeds),
            capitalDeployed: roundTo(item.capitalDeployed),
        }));
}

/**
 * Formats YYYY-MM to readable short string like "Aug 2026".
 * @param {string} ymStr
 * @returns {string}
 */
export function formatMonthLabel(ymStr) {
    if (!ymStr) return '';
    const [year, month] = ymStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
        return `${months[monthIdx]} '${year.slice(-2)}`;
    }
    return ymStr;
}

/**
 * Computes Best and Worst Performing Investments across all stocks and IPOs.
 * Aggregates both realized gains and open unrealized gains (where valid CMP is present).
 * 
 * @param {Array<object>} allSales
 * @param {Array<object>} allOpenHoldings
 * @returns {{ rankedInvestments: Array<object>, unpricedInvestments: Array<object> }}
 */
export function rankInvestmentsPerformance(allSales = [], allOpenHoldings = []) {
    const entityMap = {};

    // 1. Incorporate completed sales
    for (const sale of allSales) {
        const key = `${sale.assetType}-${sale.symbol}`;
        if (!entityMap[key]) {
            entityMap[key] = {
                key,
                symbol: sale.symbol,
                companyName: sale.companyName,
                assetType: sale.assetType,
                investedCost: 0,
                realizedPnL: 0,
                unrealizedPnL: 0,
                currentValue: 0,
                totalSoldShares: 0,
                openQuantity: 0,
                hasOpenPosition: false,
                hasCmp: true,
                lastTransactionDate: sale.transactionDate,
            };
        }

        const item = entityMap[key];
        item.investedCost += sale.costBasis;
        item.realizedPnL += sale.realizedPnL;
        item.totalSoldShares += sale.quantity;
        if (sale.transactionDate > item.lastTransactionDate) {
            item.lastTransactionDate = sale.transactionDate;
        }
    }

    // 2. Incorporate active open positions
    for (const open of allOpenHoldings) {
        const key = `${open.assetType}-${open.symbol}`;
        if (!entityMap[key]) {
            entityMap[key] = {
                key,
                symbol: open.symbol,
                companyName: open.companyName,
                assetType: open.assetType,
                investedCost: 0,
                realizedPnL: 0,
                unrealizedPnL: 0,
                currentValue: 0,
                totalSoldShares: 0,
                openQuantity: 0,
                hasOpenPosition: true,
                hasCmp: open.hasCmp,
                lastTransactionDate: open.entryDate || '',
            };
        }

        const item = entityMap[key];
        item.hasOpenPosition = true;
        item.openQuantity += open.quantity;
        item.investedCost += open.investedValue;

        if (open.hasCmp && open.currentValue !== null) {
            item.currentValue += open.currentValue;
            item.unrealizedPnL += (open.unrealizedPnL || 0);
        } else {
            item.hasCmp = false;
        }
    }

    const ranked = [];
    const unpriced = [];

    for (const item of Object.values(entityMap)) {
        const totalPnL = roundTo(item.realizedPnL + (item.hasCmp ? item.unrealizedPnL : 0));
        const invested = roundTo(item.investedCost);
        const returnPercent = invested > 0 && item.hasCmp ? roundTo((totalPnL / invested) * 100) : null;

        const record = {
            ...item,
            totalPnL,
            investedCost: invested,
            realizedPnL: roundTo(item.realizedPnL),
            unrealizedPnL: item.hasCmp ? roundTo(item.unrealizedPnL) : null,
            returnPercent,
        };

        if (item.hasOpenPosition && !item.hasCmp && item.realizedPnL === 0) {
            unpriced.push(record);
        } else {
            ranked.push(record);
        }
    }

    // Sort by totalPnL descending
    ranked.sort((a, b) => b.totalPnL - a.totalPnL);

    return {
        rankedInvestments: ranked,
        unpricedInvestments: unpriced,
    };
}

/**
 * Calculates Cumulative Capital Deployment Timeline over time.
 * Shows how invested capital was gradually deployed.
 * 
 * @param {Array<object>} transactions
 * @param {Array<object>} ipos
 * @returns {Array<object>}
 */
export function calculateCapitalDeploymentTimeline(transactions = [], ipos = []) {
    const events = [];

    for (const tx of transactions) {
        if (tx.asset_type === 'stock' && tx.transaction_type === 'buy' && tx.transaction_date) {
            events.push({
                date: normalizeDate(tx.transaction_date),
                amount: Number(tx.total_amount) || 0,
                name: tx.symbol,
            });
        }
    }

    for (const ipo of ipos) {
        if (ipo.allotment && Number(ipo.allotment.allotted_amount) > 0) {
            const date = normalizeDate(ipo.allotment.allotment_date || ipo.application_date);
            if (date) {
                events.push({
                    date,
                    amount: Number(ipo.allotment.allotted_amount) || 0,
                    name: ipo.symbol,
                });
            }
        }
    }

    // Sort chronologically
    events.sort((a, b) => a.date.localeCompare(b.date));

    let cumulative = 0;
    const timeline = events.map(e => {
        cumulative += e.amount;
        return {
            date: e.date,
            deployedThisTrade: roundTo(e.amount),
            cumulativeDeployed: roundTo(cumulative),
            label: e.name,
        };
    });

    return timeline;
}
