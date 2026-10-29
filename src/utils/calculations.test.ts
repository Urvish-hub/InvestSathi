import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roundTo,
  formatCurrency,
  calculateIpoApplication,
  calculateAllotmentAmounts,
  calculateListingGain,
  calculateIpoSalesSummary,
  calculateStockHoldings,
  calculateOverallSummary,
} from './calculations.js';

test('roundTo safely handles float math', () => {
  assert.equal(roundTo(0.1 + 0.2), 0.3);
  assert.equal(roundTo(1450.555, 2), 1450.56);
  assert.equal(roundTo(null), 0);
  assert.equal(roundTo(undefined), 0);
});

test('calculateIpoApplication calculates shares and amount correctly', () => {
  // Bid price 500, Lot size 30, Lots 2 => 60 shares, 30,000 application amount
  const result = calculateIpoApplication(500, 30, 2);
  assert.equal(result.totalSharesApplied, 60);
  assert.equal(result.applicationAmount, 30000);
});

test('calculateAllotmentAmounts handles zero allotment (refund)', () => {
  const result = calculateAllotmentAmounts(500, 30000, 0);
  assert.equal(result.allottedAmount, 0);
  assert.equal(result.refundAmount, 30000);
});

test('calculateAllotmentAmounts handles full allotment', () => {
  const result = calculateAllotmentAmounts(500, 30000, 60);
  assert.equal(result.allottedAmount, 30000);
  assert.equal(result.refundAmount, 0);
});

test('calculateAllotmentAmounts handles partial allotment', () => {
  // Applied for 60 shares (30,000), got allotted 30 shares
  const result = calculateAllotmentAmounts(500, 30000, 30);
  assert.equal(result.allottedAmount, 15000);
  assert.equal(result.refundAmount, 15000);
});

test('calculateListingGain calculates gross listing gains and percent', () => {
  // Issue 500, Listing 750, 30 shares
  const result = calculateListingGain(500, 750, 30);
  assert.equal(result.listingGainAmount, 7500); // (750-500) * 30 = 7500
  assert.equal(result.listingGainPercent, 50); // 50% gain
});

test('calculateListingGain handles listing at a loss', () => {
  const result = calculateListingGain(500, 450, 30);
  assert.equal(result.listingGainAmount, -1500);
  assert.equal(result.listingGainPercent, -10);
});

test('calculateIpoSalesSummary tracks partial sales, charges and remaining shares', () => {
  const bidPrice = 500;
  const allottedShares = 60;
  const sales = [
    { quantity: 30, price: 800, brokerage_charges: 20 }, // Sale 1: gain (800-500)*30 - 20 = 8980
    { quantity: 15, price: 900, brokerage_charges: 15 }, // Sale 2: gain (900-500)*15 - 15 = 5985
  ];

  const summary = calculateIpoSalesSummary(bidPrice, allottedShares, sales);
  assert.equal(summary.totalSoldShares, 45);
  assert.equal(summary.remainingShares, 15);
  assert.equal(summary.totalSaleValue, 24000 + 13500); // 37500
  assert.equal(summary.totalCharges, 35);
  assert.equal(summary.totalRealizedPnL, 8980 + 5985); // 14965
  assert.equal(summary.costBasisOfRemaining, 15 * 500); // 7500
});

test('calculateStockHoldings handles buys, sells with weighted average cost basis', () => {
  const transactions = [
    {
      symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      transaction_type: 'buy',
      quantity: 10,
      price: 3000,
      brokerage_charges: 20,
      transaction_date: '2026-01-10',
    },
    {
      symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      transaction_type: 'buy',
      quantity: 10,
      price: 3200,
      brokerage_charges: 20,
      transaction_date: '2026-01-20',
    },
    // Buy 1: 10 @ 3000 (+20) = 30020
    // Buy 2: 10 @ 3200 (+20) = 32020
    // Total: 20 shares, total cost 62040 => Avg cost = 3102/share
    {
      symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      transaction_type: 'sell',
      quantity: 5,
      price: 3500,
      brokerage_charges: 15,
      transaction_date: '2026-02-01',
    },
    // Sell 5 @ 3500: Gross proceeds = 17500, Net proceeds = 17485
    // Cost basis of 5 shares = 5 * 3102 = 15510
    // Realized PnL = 17485 - 15510 = 1975
  ];

  const holdings = calculateStockHoldings(transactions, { TCS: 3600 });
  assert.equal(holdings.length, 1);
  const tcs = holdings[0];
  assert.equal(tcs.symbol, 'TCS');
  assert.equal(tcs.quantity, 15);
  assert.equal(tcs.avgCostPerShare, 3102);
  assert.equal(tcs.realizedPnL, 1975);
  assert.equal(tcs.currentValue, 15 * 3600); // 54000
  assert.equal(tcs.unrealizedPnL, 54000 - (15 * 3102)); // 54000 - 46530 = 7470
});

test('calculateOverallSummary computes portfolio metrics and win-rate', () => {
  const ipos = [
    {
      application_amount: 30000,
      bid_price: 500,
      status: 'listed',
      allotment: { allotted_shares: 60 },
      salesSummary: { totalRealizedPnL: 5000, remainingShares: 0 },
    },
    {
      application_amount: 15000,
      bid_price: 250,
      status: 'not_allotted',
      allotment: { allotted_shares: 0 },
      salesSummary: null,
    },
  ];

  const holdings = [
    {
      symbol: 'INFY',
      isActiveHolding: true,
      investedValue: 20000,
      currentValue: 25000,
      realizedPnL: 1200,
    },
  ];

  const summary = calculateOverallSummary(ipos, holdings, []);
  assert.equal(summary.ipoTotalAppliedAmount, 45000);
  assert.equal(summary.ipoTotalApplications, 2);
  assert.equal(summary.ipoAllottedCount, 1);
  assert.equal(summary.ipoAllotmentWinRate, 50);
  assert.equal(summary.totalRealizedPnL, 5000 + 1200); // 6200
});
