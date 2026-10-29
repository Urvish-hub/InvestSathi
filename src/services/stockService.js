/**
 * Stock Transaction and Portfolio Data Service for InvestSathi
 * Encapsulates all database operations for stock buys, sells, transactions, and manual market prices.
 */
import { supabase } from '../lib/supabaseClient.js';
import { calculateStockHoldings } from '../utils/calculations.js';

const MANUAL_PRICES_STORAGE_KEY = 'investsathi_manual_stock_prices';

/**
 * Gets user-entered manual market prices from localStorage.
 */
export function getManualMarketPrices() {
  try {
    const raw = localStorage.getItem(MANUAL_PRICES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Saves a user-entered manual market price for a symbol.
 */
export function saveManualMarketPrice(symbol, price) {
  try {
    const cleanSym = (symbol || '').toUpperCase().trim();
    const cleanPrice = Number(price);
    if (!cleanSym || isNaN(cleanPrice) || cleanPrice < 0) return;

    const current = getManualMarketPrices();
    current[cleanSym] = cleanPrice;
    localStorage.setItem(MANUAL_PRICES_STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (e) {
    return {};
  }
}

/**
 * Fetches all transactions (stock and IPO) for the user.
 */
export async function fetchTransactions(userId, filter = {}) {
  if (!userId) throw new Error('User ID is required');

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (filter.asset_type && filter.asset_type !== 'all') {
    query = query.eq('asset_type', filter.asset_type);
  }

  if (filter.transaction_type && filter.transaction_type !== 'all') {
    query = query.eq('transaction_type', filter.transaction_type);
  }

  if (filter.symbol) {
    query = query.ilike('symbol', `%${filter.symbol.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetches a single transaction by ID.
 */
export async function fetchTransactionById(transactionId, userId) {
  if (!transactionId || !userId) throw new Error('Transaction ID and User ID are required');

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new stock transaction.
 */
export async function createStockTransaction(userId, txData) {
  if (!userId) throw new Error('User ID is required');

  const qty = parseInt(txData.quantity, 10);
  const price = Number(txData.price);
  const charges = Number(txData.brokerage_charges || 0);
  const totalAmount = (qty * price) + (txData.transaction_type === 'buy' ? charges : -charges);

  const payload = {
    user_id: userId,
    asset_type: 'stock',
    transaction_type: txData.transaction_type, // 'buy' or 'sell'
    symbol: txData.symbol.toUpperCase().trim(),
    company_name: txData.company_name.trim(),
    quantity: qty,
    price,
    brokerage_charges: charges,
    total_amount: Math.max(0, totalAmount),
    transaction_date: txData.transaction_date || new Date().toISOString().split('T')[0],
    notes: txData.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing stock transaction.
 */
export async function updateStockTransaction(transactionId, userId, txData) {
  if (!transactionId || !userId) throw new Error('Transaction ID and User ID are required');

  const qty = parseInt(txData.quantity, 10);
  const price = Number(txData.price);
  const charges = Number(txData.brokerage_charges || 0);
  const totalAmount = (qty * price) + (txData.transaction_type === 'buy' ? charges : -charges);

  const payload = {
    transaction_type: txData.transaction_type,
    symbol: txData.symbol.toUpperCase().trim(),
    company_name: txData.company_name.trim(),
    quantity: qty,
    price,
    brokerage_charges: charges,
    total_amount: Math.max(0, totalAmount),
    transaction_date: txData.transaction_date,
    notes: txData.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a transaction.
 */
export async function deleteStockTransaction(transactionId, userId) {
  if (!transactionId || !userId) throw new Error('Transaction ID and User ID are required');

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

/**
 * Fetches user stock transactions and computes the portfolio holdings.
 */
export async function fetchStockHoldings(userId) {
  if (!userId) throw new Error('User ID is required');

  const { data: stockTransactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('asset_type', 'stock')
    .order('transaction_date', { ascending: true });

  if (error) throw error;

  const manualPrices = getManualMarketPrices();
  const holdings = calculateStockHoldings(stockTransactions || [], manualPrices);

  return {
    holdings,
    transactions: stockTransactions || [],
    manualPrices,
  };
}
