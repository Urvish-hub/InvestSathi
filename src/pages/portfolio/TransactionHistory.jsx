import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchTransactions,
  deleteStockTransaction,
} from '../../services/stockService.js';
import { formatCurrency } from '../../utils/calculations.js';
import {
  Badge,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
} from '../../components/common/UIComponents.jsx';
import {
  Clock,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Download,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export function TransactionHistory() {
  const { user, profile } = useAuth();
  const currencySymbol = profile?.preferred_currency || '₹';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all'); // all, buy, sell, ipo
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTransactions(user.id);
      setTransactions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    try {
      await deleteStockTransaction(deleteTarget.id, user.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      alert(`Error deleting transaction: ${err.message}`);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.company_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'all') return true;
    if (typeFilter === 'buy') return tx.transaction_type === 'buy';
    if (typeFilter === 'sell') return tx.transaction_type === 'sell' && tx.asset_type === 'stock';
    if (typeFilter === 'ipo') return tx.asset_type === 'ipo';
    return true;
  });

  // Export to CSV
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = ['Date', 'Asset Type', 'Type', 'Symbol', 'Company', 'Quantity', 'Price', 'Charges', 'Total Amount', 'Notes'];
    const rows = transactions.map((t) => [
      t.transaction_date,
      t.asset_type,
      t.transaction_type,
      t.symbol,
      `"${(t.company_name || '').replace(/"/g, '""')}"`,
      t.quantity,
      t.price,
      t.brokerage_charges || 0,
      t.total_amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `InvestSathi_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingSpinner text="Loading transaction records from Supabase..." size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-400" />
            Transaction History & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Complete audited record of stock trades and IPO share sales
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <Link
            to="/transactions/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record Trade</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions by ticker or company name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Trades' },
            { id: 'buy', label: 'Stock Buys' },
            { id: 'sell', label: 'Stock Sells' },
            { id: 'ipo', label: 'IPO Sales' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                typeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Transactions Found"
          description={
            searchQuery || typeFilter !== 'all'
              ? 'No transactions match your current search and type filters.'
              : 'You have not recorded any stock transactions or IPO sales yet.'
          }
          actionText="+ Record Stock Trade"
          onAction={() => window.location.assign('/transactions/new')}
        />
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-750 bg-slate-850/70 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Symbol / Company</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Charges</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-750/60 font-mono">
                {filteredTransactions.map((tx) => {
                  const isBuy = tx.transaction_type === 'buy';
                  const isIpo = tx.asset_type === 'ipo';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-750/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-300 font-sans whitespace-nowrap">
                        {tx.transaction_date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            isBuy
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isIpo
                              ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isIpo ? 'IPO SALE' : tx.transaction_type.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white font-mono">{tx.symbol}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          {tx.company_name}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                        {tx.quantity}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-300">
                        {currencySymbol}{tx.price}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {currencySymbol}{tx.brokerage_charges || 0}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        <span className={isBuy ? 'text-slate-200' : 'text-emerald-400'}>
                          {isBuy ? '' : '+'}{formatCurrency(tx.total_amount, currencySymbol)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {tx.asset_type === 'stock' ? (
                            <Link
                              to={`/transactions/${tx.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                              title="Edit trade"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <Link
                              to={`/ipos/${tx.ipo_id}`}
                              className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-slate-700/60 transition-colors"
                              title="View parent IPO"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(tx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message={`Delete trade record for ${deleteTarget?.symbol} (${deleteTarget?.quantity} shares at ${currencySymbol}${deleteTarget?.price})?`}
      />
    </div>
  );
}
