import test from 'node:test';
import assert from 'node:assert/strict';
import {
    isDateInPeriod,
    extractCompletedSales,
    getActiveHoldings,
    calculateComprehensiveAnalytics,
    calculateMonthlyPerformanceSeries,
    rankInvestmentsPerformance,
    calculateCapitalDeploymentTimeline,
} from './analyticsCalculations.js';

test('isDateInPeriod correctly evaluates all, yearly, monthly, and custom', () => {
    assert.equal(isDateInPeriod('2026-09-15', { type: 'all' }), true);
    assert.equal(isDateInPeriod('2026-09-15', { type: 'yearly', year: 2026 }), true);
    assert.equal(isDateInPeriod('2026-09-15', { type: 'yearly', year: 2025 }), false);
    assert.equal(isDateInPeriod('2026-09-15', { type: 'monthly', month: '2026-09' }), true);
    assert.equal(isDateInPeriod('2026-09-15', { type: 'monthly', month: '2026-10' }), false);
    assert.equal(isDateInPeriod('2026-09-15', { type: 'custom', startDate: '2026-09-01', endDate: '2026-09-30' }), true);
    assert.equal(isDateInPeriod('2026-10-01', { type: 'custom', startDate: '2026-09-01', endDate: '2026-09-30' }), false);
});

test('extractCompletedSales does not count IPOs with 0 allotment or pending applications as sales', () => {
    const ipos = [
        {
            symbol: 'WAAREE',
            company_name: 'Waaree Energies',
            bid_price: 1500,
            status: 'applied',
            allotment: null,
            sales: [],
        },
        {
            symbol: 'PREMIER',
            company_name: 'Premier Energies',
            bid_price: 450,
            status: 'listed',
            allotment: { allotted_shares: 33, allotted_amount: 14850 },
            sales: [
                {
                    quantity: 20,
                    price: 980,
                    brokerage_charges: 25,
                    transaction_date: '2026-09-03',
                },
            ],
        },
    ];

    const sales = extractCompletedSales(ipos, []);
    assert.equal(sales.length, 1);
    assert.equal(sales[0].symbol, 'PREMIER');
    assert.equal(sales[0].quantity, 20);
    assert.equal(sales[0].costBasis, 9000); // 20 * 450
    assert.equal(sales[0].netProceeds, 19575); // (20 * 980) - 25 = 19600 - 25
    assert.equal(sales[0].realizedPnL, 10575); // 19575 - 9000
});

test('getActiveHoldings handles unpriced holdings without crashing or inventing prices', () => {
    const ipos = [
        {
            id: 'ipo-1',
            symbol: 'BAJAJHFL',
            company_name: 'Bajaj Housing Finance',
            bid_price: 70,
            allotment: { allotted_shares: 214, listing_price: null },
            sales: [],
        },
    ];

    const stockHoldings = [
        {
            symbol: 'INFY',
            companyName: 'Infosys Ltd',
            quantity: 10,
            avgCostPerShare: 1800,
            investedValue: 18000,
            manualPrice: null,
            currentValue: null,
            unrealizedPnL: null,
            isActiveHolding: true,
        },
    ];

    const result = getActiveHoldings(ipos, stockHoldings, {});
    assert.equal(result.allOpen.length, 2);
    assert.equal(result.allOpen[0].hasCmp, false);
    assert.equal(result.allOpen[1].hasCmp, false);
    assert.equal(result.allOpen[0].currentValue, null);
    assert.equal(result.allOpen[1].currentValue, null);
});

test('calculateComprehensiveAnalytics correctly separates open invested vs unallotted bids', () => {
    const ipos = [
        {
            id: 'ipo-1',
            symbol: 'BAJAJHFL',
            bid_price: 70,
            application_amount: 15000,
            status: 'listed',
            allotment: { allotted_shares: 214, allotted_amount: 14980 },
            sales: [],
        },
        {
            id: 'ipo-2',
            symbol: 'UNALLOTTED',
            bid_price: 500,
            application_amount: 15000,
            status: 'not_allotted',
            allotment: { allotted_shares: 0, allotted_amount: 0, refund_amount: 15000 },
            sales: [],
        },
    ];

    const stockHoldings = [
        {
            symbol: 'TCS',
            companyName: 'Tata Consultancy',
            quantity: 5,
            avgCostPerShare: 4000,
            investedValue: 20000,
            manualPrice: 4200,
            currentValue: 21000,
            unrealizedPnL: 1000,
            unrealizedPnLPercent: 5,
            realizedPnL: 0,
            isActiveHolding: true,
        },
    ];

    const analytics = calculateComprehensiveAnalytics({
        ipos,
        stockHoldings,
        transactions: [],
        manualPrices: {},
        filter: { type: 'all' },
    });

    // Only Bajaj Housing Finance allotted cost (214 * 70 = 14980) + TCS (20000) = 34980
    // Unallotted 15000 must NOT be in totalInvestedAmount
    assert.equal(analytics.totalInvestedAmount, 34980);
    assert.equal(analytics.ipoInvested, 14980);
    assert.equal(analytics.stockInvested, 20000);
});

test('rankInvestmentsPerformance ranks by profit and returns unpriced positions separately', () => {
    const allSales = [
        {
            assetType: 'stock',
            symbol: 'RELIANCE',
            companyName: 'Reliance Industries',
            quantity: 10,
            costBasis: 25000,
            netProceeds: 30000,
            realizedPnL: 5000,
            transactionDate: '2026-08-10',
        },
        {
            assetType: 'stock',
            symbol: 'PAYTM',
            companyName: 'One97 Communications',
            quantity: 20,
            costBasis: 16000,
            netProceeds: 12000,
            realizedPnL: -4000,
            transactionDate: '2026-09-01',
        },
    ];

    const allOpen = [
        {
            assetType: 'stock',
            symbol: 'UNKNOWN',
            companyName: 'Unpriced Stock',
            quantity: 5,
            investedValue: 5000,
            hasCmp: false,
            currentValue: null,
            unrealizedPnL: null,
        },
    ];

    const { rankedInvestments, unpricedInvestments } = rankInvestmentsPerformance(allSales, allOpen);

    assert.equal(rankedInvestments.length, 2);
    assert.equal(rankedInvestments[0].symbol, 'RELIANCE');
    assert.equal(rankedInvestments[0].totalPnL, 5000);
    assert.equal(rankedInvestments[1].symbol, 'PAYTM');
    assert.equal(rankedInvestments[1].totalPnL, -4000);

    assert.equal(unpricedInvestments.length, 1);
    assert.equal(unpricedInvestments[0].symbol, 'UNKNOWN');
});
