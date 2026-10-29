/**
 * InvestSathi Analytics PDF & CSV Export Utilities
 * 
 * Generates branded, high-fidelity PDF financial statements and
 * RFC-4180 compliant CSV exports for personal accounting and tax filing.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, roundTo } from './calculations.js';

/**
 * Downloads a Blob file in desktop browsers or Capacitor Android WebViews.
 * 
 * @param {Blob} blob - File blob
 * @param {string} fileName - Destination filename
 */
export function downloadFile(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 300);
}

/**
 * Escapes CSV values according to RFC 4180 (handling commas, double quotes, newlines).
 * 
 * @param {any} val
 * @returns {string}
 */
export function escapeCsv(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
}

/**
 * 1. Export Transactions Ledger CSV
 */
export function exportTransactionsCsv({ transactions = [], periodLabel = 'All_Time' }) {
    const headers = [
        'Transaction Date',
        'Asset Type',
        'Transaction Type',
        'Symbol',
        'Company Name',
        'Quantity',
        'Execution Price (INR)',
        'Brokerage Charges (INR)',
        'Total Amount (INR)',
        'Notes',
    ];

    const rows = transactions.map(t => [
        t.transaction_date || '',
        (t.asset_type || 'stock').toUpperCase(),
        (t.transaction_type || '').toUpperCase(),
        t.symbol || '',
        t.company_name || '',
        t.quantity || 0,
        roundTo(t.price, 2),
        roundTo(t.brokerage_charges, 2),
        roundTo(t.total_amount, 2),
        t.notes || '',
    ]);

    const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map(r => r.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `InvestSathi_Transactions_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * 2. Export Investment Summary & Performance CSV
 */
export function exportInvestmentSummaryCsv({
    rankedInvestments = [],
    unpricedInvestments = [],
    periodLabel = 'All_Time',
}) {
    const headers = [
        'Asset Type',
        'Symbol',
        'Company Name',
        'Invested Cost (INR)',
        'Current / Sale Value (INR)',
        'Realized P&L (INR)',
        'Unrealized P&L (INR)',
        'Total Net P&L (INR)',
        'Return %',
        'Status',
        'Last Activity Date',
    ];

    const allItems = [
        ...rankedInvestments.map(item => ({ ...item, isPriced: true })),
        ...unpricedInvestments.map(item => ({ ...item, isPriced: false })),
    ];

    const rows = allItems.map(item => [
        (item.assetType || '').toUpperCase(),
        item.symbol || '',
        item.companyName || '',
        roundTo(item.investedCost, 2),
        item.currentValue ? roundTo(item.currentValue, 2) : 'N/A',
        roundTo(item.realizedPnL, 2),
        item.unrealizedPnL !== null ? roundTo(item.unrealizedPnL, 2) : 'Awaiting CMP',
        roundTo(item.totalPnL, 2),
        item.returnPercent !== null ? `${roundTo(item.returnPercent, 2)}%` : 'N/A',
        item.hasOpenPosition ? 'OPEN' : 'CLOSED',
        item.lastTransactionDate || '',
    ]);

    const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map(r => r.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `InvestSathi_Investment_Summary_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * 3. Export Monthly/Yearly Performance CSV
 */
export function exportMonthlyPerformanceCsv({ monthlySeries = [], periodLabel = 'All_Time' }) {
    const headers = [
        'Month',
        'Realized P&L (INR)',
        'IPO Realized P&L (INR)',
        'Stock Realized P&L (INR)',
        'Sales Proceeds (INR)',
        'Capital Deployed (INR)',
        'Sales Count',
        'Buys Count',
        'Total Transactions',
    ];

    const rows = monthlySeries.map(m => [
        m.month,
        roundTo(m.realizedPnL, 2),
        roundTo(m.ipoRealizedPnL, 2),
        roundTo(m.stockRealizedPnL, 2),
        roundTo(m.salesProceeds, 2),
        roundTo(m.capitalDeployed, 2),
        m.salesCount,
        m.buysCount,
        m.totalTransactions,
    ]);

    const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map(r => r.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `InvestSathi_Monthly_Report_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Generates Complete Branded PDF Financial Report
 */
export function exportAnalyticsPdf({
    analyticsData,
    monthlySeries = [],
    rankedInvestments = [],
    unpricedInvestments = [],
    profile,
    user,
    periodLabel = 'All Time',
}) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    // Brand Colors
    const navyBg = [15, 23, 42];     // #0f172a
    const tealAccent = [16, 185, 129]; // #10b981
    const darkGray = [51, 65, 85];    // #334155
    const lightGray = [241, 245, 249]; // #f1f5f9
    const textDark = [15, 23, 42];

    let currentY = margin;

    // 1. Header Banner
    doc.setFillColor(...navyBg);
    doc.rect(margin, currentY, contentWidth, 68, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('InvestSathi', margin + 18, currentY + 30);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text('IPO & Stock Investment Tracker - Financial Statement', margin + 18, currentY + 48);

    // Right Header Info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    const genDateStr = `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const periodText = `Reporting Period: ${periodLabel}`;
    doc.text(genDateStr, pageWidth - margin - 18, currentY + 28, { align: 'right' });
    doc.text(periodText, pageWidth - margin - 18, currentY + 44, { align: 'right' });

    currentY += 82;

    // 2. Investor Meta
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    const investorName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Valued Investor';
    doc.text(`Investor: ${investorName}`, margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const panInfo = profile?.pan_number ? `PAN: ${profile.pan_number}` : 'PAN: Not Set';
    const dematInfo = profile?.demat_account_no ? `Demat BOID: ${profile.demat_account_no}` : '';
    doc.text(`${panInfo} ${dematInfo ? '  |  ' + dematInfo : ''}`, margin, currentY + 14);

    currentY += 28;

    // 3. Portfolio Overview Cards (Key Metrics Table)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.text('1. Portfolio Overview Summary', margin, currentY);
    currentY += 8;

    const pnlSign = (analyticsData.realizedPnL || 0) >= 0 ? '+' : '';
    const unrealizedSign = (analyticsData.unrealizedPnL || 0) >= 0 ? '+' : '';

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
            fillColor: navyBg,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 5,
        },
        columns: [
            { header: 'Metric', dataKey: 'metric' },
            { header: 'Value (INR)', dataKey: 'value' },
            { header: 'Status / Notes', dataKey: 'notes' },
        ],
        body: [
            {
                metric: 'Total Invested Capital (Open Holdings)',
                value: formatCurrency(analyticsData.totalInvestedAmount),
                notes: `Across ${analyticsData.totalOpenHoldingsCount} active holdings`,
            },
            {
                metric: 'Current Portfolio Market Value',
                value: analyticsData.currentPortfolioValue !== null ? formatCurrency(analyticsData.currentPortfolioValue) : 'Awaiting CMP',
                notes: analyticsData.totalUnpricedCount > 0 ? `${analyticsData.totalUnpricedCount} unpriced holding(s)` : '100% priced',
            },
            {
                metric: 'Net Realized Profit / Loss',
                value: `${pnlSign}${formatCurrency(analyticsData.realizedPnL)}`,
                notes: `${analyticsData.realizedReturnPercent}% realized return`,
            },
            {
                metric: 'Unrealized Profit / Loss',
                value: analyticsData.unrealizedPnL !== null ? `${unrealizedSign}${formatCurrency(analyticsData.unrealizedPnL)}` : 'Awaiting CMP',
                notes: analyticsData.unrealizedReturnPercent !== null ? `${roundTo(analyticsData.unrealizedReturnPercent)}% on priced cost` : 'Not calculable',
            },
            {
                metric: 'Capital Deployed in Period',
                value: formatCurrency(analyticsData.periodCapitalDeployed),
                notes: `${analyticsData.periodBuyCount} buy transactions / allotments`,
            },
        ],
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // 4. IPO vs Stock Asset Allocation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.text('2. Asset Class Allocation (IPOs vs Stocks)', margin, currentY);
    currentY += 8;

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: darkGray, fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 4.5 },
        columns: [
            { header: 'Asset Class', dataKey: 'asset' },
            { header: 'Invested Cost (INR)', dataKey: 'invested' },
            { header: 'Allocation %', dataKey: 'allocation' },
            { header: 'Current Value (INR)', dataKey: 'currentVal' },
            { header: 'Realized P&L (INR)', dataKey: 'realized' },
            { header: 'Unrealized P&L (INR)', dataKey: 'unrealized' },
        ],
        body: [
            {
                asset: 'IPO Holdings',
                invested: formatCurrency(analyticsData.ipoInvested),
                allocation: `${analyticsData.ipoAllocationPercent}%`,
                currentVal: analyticsData.ipoCurrentValue !== null ? formatCurrency(analyticsData.ipoCurrentValue) : 'Pending CMP',
                realized: formatCurrency(analyticsData.ipoRealizedPnL),
                unrealized: analyticsData.ipoUnrealizedPnL !== null ? formatCurrency(analyticsData.ipoUnrealizedPnL) : 'Pending CMP',
            },
            {
                asset: 'Stock Holdings',
                invested: formatCurrency(analyticsData.stockInvested),
                allocation: `${analyticsData.stockAllocationPercent}%`,
                currentVal: analyticsData.stockCurrentValue !== null ? formatCurrency(analyticsData.stockCurrentValue) : 'Pending CMP',
                realized: formatCurrency(analyticsData.stockRealizedPnL),
                unrealized: analyticsData.stockUnrealizedPnL !== null ? formatCurrency(analyticsData.stockUnrealizedPnL) : 'Pending CMP',
            },
        ],
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // 5. Best & Worst Performers
    if (currentY > pageHeight - 160) {
        doc.addPage();
        currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.text('3. Investment Performance Ranking', margin, currentY);
    currentY += 8;

    const topItems = rankedInvestments.slice(0, 8);
    if (topItems.length > 0) {
        autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            headStyles: { fillColor: navyBg, fontSize: 8.5 },
            styles: { fontSize: 8, cellPadding: 4 },
            columns: [
                { header: 'Investment / Symbol', dataKey: 'name' },
                { header: 'Type', dataKey: 'type' },
                { header: 'Cost Basis (INR)', dataKey: 'cost' },
                { header: 'Realized P&L (INR)', dataKey: 'realized' },
                { header: 'Total Net P&L (INR)', dataKey: 'total' },
                { header: 'Return %', dataKey: 'return' },
                { header: 'Status', dataKey: 'status' },
            ],
            body: topItems.map(item => ({
                name: `${item.companyName} (${item.symbol})`,
                type: item.assetType.toUpperCase(),
                cost: formatCurrency(item.investedCost),
                realized: formatCurrency(item.realizedPnL),
                total: formatCurrency(item.totalPnL),
                return: item.returnPercent !== null ? `${item.returnPercent}%` : 'N/A',
                status: item.hasOpenPosition ? 'OPEN' : 'CLOSED',
            })),
        });
        currentY = doc.lastAutoTable.finalY + 20;
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('No completed sales or priced investments available to rank.', margin, currentY + 12);
        currentY += 30;
    }

    // 6. Monthly Breakdown
    if (monthlySeries.length > 0) {
        if (currentY > pageHeight - 160) {
            doc.addPage();
            currentY = margin;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...textDark);
        doc.text('4. Monthly Financial Trend & Trade Volume', margin, currentY);
        currentY += 8;

        autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            theme: 'striped',
            headStyles: { fillColor: darkGray, fontSize: 8.5 },
            styles: { fontSize: 8, cellPadding: 4 },
            columns: [
                { header: 'Month', dataKey: 'month' },
                { header: 'Realized P&L (INR)', dataKey: 'pnl' },
                { header: 'Sales Proceeds (INR)', dataKey: 'proceeds' },
                { header: 'Capital Deployed (INR)', dataKey: 'deployed' },
                { header: 'Trades', dataKey: 'count' },
            ],
            body: monthlySeries.map(m => ({
                month: m.label || m.month,
                pnl: `${m.realizedPnL >= 0 ? '+' : ''}${formatCurrency(m.realizedPnL)}`,
                proceeds: formatCurrency(m.salesProceeds),
                deployed: formatCurrency(m.capitalDeployed),
                count: m.totalTransactions,
            })),
        });
        currentY = doc.lastAutoTable.finalY + 20;
    }

    // 7. Footer & Regulatory Notes
    if (currentY > pageHeight - 90) {
        doc.addPage();
        currentY = margin;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
        'Disclaimer: This financial statement is computed based on user-entered transaction records, IPO allotment notifications, and manual market prices.',
        margin,
        currentY
    );
    doc.text(
        'Unallotted IPO application funds are classified as refunds, not losses. For official Indian income tax filing (STCG/LTCG), consult a certified Chartered Accountant.',
        margin,
        currentY + 10
    );
    doc.text(
        'Generated by InvestSathi Personal IPO & Stock Portfolio Tracker. Confidential & strictly for investor personal records.',
        margin,
        currentY + 20
    );

    // Save / Download PDF
    const fileName = `InvestSathi_Analytics_Report_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
