/**
 * InvestSathi Financial Calculation Engine
 * Pure functions for IPO lifecycle and stock portfolio calculations.
 * Strict decimal-safe arithmetic to prevent JavaScript floating point precision issues.
 */

/**
 * Rounds a number to specified decimal places safely.
 * @param {number | null | undefined} num 
 * @param {number} decimals 
 * @returns {number}
 */
export function roundTo(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a currency amount with the chosen currency symbol.
 * @param {number} amount 
 * @param {string} currencySymbol 
 * @returns {string}
 */
export function formatCurrency(amount, currencySymbol = '₹') {
  const rounded = roundTo(amount, 2);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${currencySymbol}${formatted}`;
}

/**
 * Calculates IPO Application Amount.
 * Total Shares = Lot Size * Lots Applied
 * Application Amount = Total Shares * Bid Price
 * 
 * @param {number} bidPrice - Price per share bid in IPO
 * @param {number} lotSize - Number of shares in 1 lot
 * @param {number} lotsApplied - Number of lots applied for
 * @returns {{ totalSharesApplied: number, applicationAmount: number }}
 */
export function calculateIpoApplication(bidPrice, lotSize, lotsApplied) {
  const price = Math.max(0, Number(bidPrice) || 0);
  const size = Math.max(0, parseInt(lotSize, 10) || 0);
  const lots = Math.max(0, parseInt(lotsApplied, 10) || 0);

  const totalSharesApplied = size * lots;
  const applicationAmount = roundTo(totalSharesApplied * price);

  return {
    totalSharesApplied,
    applicationAmount,
  };
}

/**
 * Calculates Actual Allotted Investment and Refund Amount.
 * CRITICAL RULE: Application amount is NOT the invested capital.
 * Only the shares actually allotted multiplied by the issue/bid price is the invested capital.
 * 
 * @param {number} bidPrice 
 * @param {number} applicationAmount 
 * @param {number} allottedShares 
 * @returns {{ allottedAmount: number, refundAmount: number }}
 */
export function calculateAllotmentAmounts(bidPrice, applicationAmount, allottedShares) {
  const price = Math.max(0, Number(bidPrice) || 0);
  const appAmount = Math.max(0, Number(applicationAmount) || 0);
  const shares = Math.max(0, parseInt(allottedShares, 10) || 0);

  const allottedAmount = roundTo(shares * price);
  const refundAmount = Math.max(0, roundTo(appAmount - allottedAmount));

  return {
    allottedAmount,
    refundAmount,
  };
}

/**
 * Calculates Gross Listing Gain / Loss.
 * (Listing Price - Bid Price) * Allotted Shares
 * 
 * @param {number} bidPrice 
 * @param {number} listingPrice 
 * @param {number} allottedShares 
 * @returns {{ listingGainAmount: number, listingGainPercent: number }}
 */
export function calculateListingGain(bidPrice, listingPrice, allottedShares) {
  const bid = Math.max(0, Number(bidPrice) || 0);
  const listing = Math.max(0, Number(listingPrice) || 0);
  const shares = Math.max(0, parseInt(allottedShares, 10) || 0);

  if (shares === 0 || bid === 0) {
    return { listingGainAmount: 0, listingGainPercent: 0 };
  }

  const listingGainAmount = roundTo((listing - bid) * shares);
  const listingGainPercent = roundTo(((listing - bid) / bid) * 100);

  return {
    listingGainAmount,
    listingGainPercent,
  };
}

/**
 * Calculates Remaining Shares and Realized Profit/Loss for IPO Share Sales.
 * 
 * @param {number} bidPrice - IPO Issue/Bid price (cost basis per share)
 * @param {number} allottedShares - Total shares received
 * @param {Array<{ quantity: number, price: number, brokerage_charges?: number }>} sales - Sales records
 * @returns {{ remainingShares: number, totalSoldShares: number, totalSaleValue: number, totalRealizedPnL: number, totalCharges: number, costBasisOfRemaining: number }}
 */
export function calculateIpoSalesSummary(bidPrice, allottedShares, sales = []) {
  const costPerShare = Math.max(0, Number(bidPrice) || 0);
  const allotted = Math.max(0, parseInt(allottedShares, 10) || 0);

  let totalSoldShares = 0;
  let totalSaleValue = 0;
  let totalRealizedPnL = 0;
  let totalCharges = 0;

  for (const sale of sales) {
    const qty = Math.max(0, parseInt(sale.quantity, 10) || 0);
    const salePrice = Math.max(0, Number(sale.price) || 0);
    const charges = Math.max(0, Number(sale.brokerage_charges) || 0);

    const saleAmount = qty * salePrice;
    const costBasis = qty * costPerShare;
    const netPnL = (saleAmount - costBasis) - charges;

    totalSoldShares += qty;
    totalSaleValue += saleAmount;
    totalCharges += charges;
    totalRealizedPnL += netPnL;
  }

  const remainingShares = Math.max(0, allotted - totalSoldShares);

  return {
    remainingShares,
    totalSoldShares,
    totalSaleValue: roundTo(totalSaleValue),
    totalRealizedPnL: roundTo(totalRealizedPnL),
    totalCharges: roundTo(totalCharges),
    costBasisOfRemaining: roundTo(remainingShares * costPerShare),
  };
}

/**
 * Calculates Stock Portfolio Holdings from a list of Buy and Sell transactions.
 * Uses Weighted Average Cost Basis for accurate accounting.
 * 
 * @param {Array<object>} transactions - List of transactions
 * @param {Record<string, number>} manualMarketPrices - Map of symbol -> current manual market price
 * @returns {Array<any>} Array of holding summaries per stock symbol
 */
export function calculateStockHoldings(transactions = [], manualMarketPrices = {}) {
  // Group by symbol
  const symbolMap = {};

  // Sort chronologically
  const sorted = [...transactions].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

  for (const tx of sorted) {
    const symbol = (tx.symbol || '').toUpperCase().trim();
    if (!symbol) continue;

    if (!symbolMap[symbol]) {
      symbolMap[symbol] = {
        symbol,
        companyName: tx.company_name || symbol,
        totalBuyQty: 0,
        totalBuyAmount: 0,
        totalSellQty: 0,
        totalSellAmount: 0,
        totalCharges: 0,
        realizedPnL: 0,
        transactions: [],
      };
    }

    const item = symbolMap[symbol];
    const qty = Math.max(0, parseInt(tx.quantity, 10) || 0);
    const price = Math.max(0, Number(tx.price) || 0);
    const charges = Math.max(0, Number(tx.brokerage_charges) || 0);
    const totalAmount = roundTo(qty * price);

    item.totalCharges += charges;
    item.transactions.push(tx);

    if (tx.transaction_type === 'buy') {
      item.totalBuyQty += qty;
      item.totalBuyAmount += (totalAmount + charges); // Include buy charges into cost
    } else if (tx.transaction_type === 'sell') {
      // Calculate cost basis for sold shares using current weighted average price
      const currentAvgCost = item.totalBuyQty > 0 ? (item.totalBuyAmount / item.totalBuyQty) : 0;
      const costOfSoldShares = currentAvgCost * qty;
      const netProceeds = totalAmount - charges;
      const tradePnL = netProceeds - costOfSoldShares;

      item.totalSellQty += qty;
      item.totalSellAmount += totalAmount;
      item.realizedPnL += tradePnL;

      // Adjust remaining buy quantity and buy amount
      item.totalBuyQty = Math.max(0, item.totalBuyQty - qty);
      item.totalBuyAmount = Math.max(0, item.totalBuyAmount - costOfSoldShares);
    }
  }

  // Calculate final holding metrics
  const holdings = Object.values(symbolMap).map(item => {
    const currentQty = item.totalBuyQty;
    const avgCostPerShare = currentQty > 0 ? roundTo(item.totalBuyAmount / currentQty) : 0;
    const investedValue = roundTo(currentQty * avgCostPerShare);

    const manualPrice = manualMarketPrices[item.symbol] !== undefined 
      ? Number(manualMarketPrices[item.symbol]) 
      : null;

    let currentValue = null;
    let unrealizedPnL = null;
    let unrealizedPnLPercent = null;

    if (manualPrice !== null && !isNaN(manualPrice) && currentQty > 0) {
      currentValue = roundTo(currentQty * manualPrice);
      unrealizedPnL = roundTo(currentValue - investedValue);
      unrealizedPnLPercent = investedValue > 0 ? roundTo((unrealizedPnL / investedValue) * 100) : 0;
    }

    return {
      symbol: item.symbol,
      companyName: item.companyName,
      quantity: currentQty,
      avgCostPerShare,
      investedValue,
      manualPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      realizedPnL: roundTo(item.realizedPnL),
      totalCharges: roundTo(item.totalCharges),
      isActiveHolding: currentQty > 0,
    };
  });

  return holdings;
}

/**
 * Calculates Overall Dashboard Portfolio Summary
 * 
 * @param {Array<object>} ipos - IPO records with allotment and sales
 * @param {Array<object>} holdings - Stock holdings
 * @param {Array<object>} transactions - All transactions
 * @returns {any} Dashboard summary metrics
 */
export function calculateOverallSummary(ipos = [], holdings = [], transactions = []) {
  let ipoTotalAppliedAmount = 0;
  let ipoActualInvestedAmount = 0;
  let ipoRealizedPnL = 0;
  let ipoActiveApplications = 0;
  let ipoAllottedCount = 0;
  let ipoTotalApplications = ipos.length;

  for (const ipo of ipos) {
    ipoTotalAppliedAmount += Number(ipo.application_amount) || 0;
    
    // Status counts
    if (ipo.status === 'applied') {
      ipoActiveApplications++;
    }
    if (ipo.status === 'allotted' || ipo.status === 'listed') {
      ipoAllottedCount++;
    }

    // Only add allotted amount to actual invested capital
    if (ipo.allotment && Number(ipo.allotment.allotted_shares) > 0) {
      const remainingShares = ipo.salesSummary?.remainingShares ?? ipo.allotment.allotted_shares;
      const bidPrice = Number(ipo.bid_price) || 0;
      ipoActualInvestedAmount += (remainingShares * bidPrice);
    }

    if (ipo.salesSummary) {
      ipoRealizedPnL += ipo.salesSummary.totalRealizedPnL || 0;
    }
  }

  // Stock metrics
  let stockInvestedAmount = 0;
  let stockCurrentValue = 0;
  let stockRealizedPnL = 0;
  let hasMissingManualPrices = false;

  for (const h of holdings) {
    if (h.isActiveHolding) {
      stockInvestedAmount += h.investedValue;
      if (h.currentValue !== null) {
        stockCurrentValue += h.currentValue;
      } else {
        hasMissingManualPrices = true;
      }
    }
    stockRealizedPnL += h.realizedPnL;
  }

  const totalInvestedCapital = roundTo(ipoActualInvestedAmount + stockInvestedAmount);
  const totalRealizedPnL = roundTo(ipoRealizedPnL + stockRealizedPnL);
  const ipoAllotmentWinRate = ipoTotalApplications > 0 
    ? roundTo((ipoAllottedCount / ipoTotalApplications) * 100) 
    : 0;

  return {
    ipoTotalAppliedAmount: roundTo(ipoTotalAppliedAmount),
    ipoActualInvestedAmount: roundTo(ipoActualInvestedAmount),
    ipoRealizedPnL: roundTo(ipoRealizedPnL),
    ipoActiveApplications,
    ipoAllottedCount,
    ipoTotalApplications,
    ipoAllotmentWinRate,
    stockInvestedAmount: roundTo(stockInvestedAmount),
    stockCurrentValue: roundTo(stockCurrentValue),
    stockRealizedPnL: roundTo(stockRealizedPnL),
    hasMissingManualPrices,
    totalInvestedCapital,
    totalRealizedPnL,
  };
}
