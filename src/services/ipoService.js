/**
 * IPO Data Access Service for InvestSathi
 * Encapsulates all database operations for IPO applications, allotments, and IPO share sales.
 */
import { supabase } from '../lib/supabaseClient.js';
import { calculateIpoSalesSummary } from '../utils/calculations.js';

/**
 * Fetches all IPO applications for the given user, joined with allotment info and sales transactions.
 */
export async function fetchIpoApplications(userId) {
  if (!userId) throw new Error('User ID is required');

  const { data: ipos, error: iposError } = await supabase
    .from('ipo_applications')
    .select(`
      *,
      allotment:ipo_allotments(*)
    `)
    .eq('user_id', userId)
    .order('application_date', { ascending: false });

  if (iposError) throw iposError;

  // Also fetch any share sales for these IPOs
  const { data: sales, error: salesError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('asset_type', 'ipo')
    .eq('transaction_type', 'sell');

  if (salesError) {
    console.warn('Could not fetch IPO sales:', salesError.message);
  }

  const salesByIpo = (sales || []).reduce((acc, sale) => {
    if (sale.ipo_id) {
      if (!acc[sale.ipo_id]) acc[sale.ipo_id] = [];
      acc[sale.ipo_id].push(sale);
    }
    return acc;
  }, {});

  // Format and attach sales summaries
  return (ipos || []).map(ipo => {
    const allotment = Array.isArray(ipo.allotment) ? ipo.allotment[0] : ipo.allotment;
    const ipoSales = salesByIpo[ipo.id] || [];
    const salesSummary = calculateIpoSalesSummary(
      ipo.bid_price,
      allotment?.allotted_shares || 0,
      ipoSales
    );

    return {
      ...ipo,
      allotment,
      sales: ipoSales,
      salesSummary,
    };
  });
}

/**
 * Fetches a single IPO application by ID with full allotment and sales history.
 */
export async function fetchIpoById(ipoId, userId) {
  if (!ipoId || !userId) throw new Error('IPO ID and User ID are required');

  const { data: ipo, error: ipoError } = await supabase
    .from('ipo_applications')
    .select(`
      *,
      allotment:ipo_allotments(*)
    `)
    .eq('id', ipoId)
    .eq('user_id', userId)
    .single();

  if (ipoError) throw ipoError;

  // Fetch sales transactions
  const { data: sales, error: salesError } = await supabase
    .from('transactions')
    .select('*')
    .eq('ipo_id', ipoId)
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (salesError) {
    console.warn('Could not fetch sales for IPO:', salesError.message);
  }

  const allotment = Array.isArray(ipo.allotment) ? ipo.allotment[0] : ipo.allotment;
  const ipoSales = sales || [];
  const salesSummary = calculateIpoSalesSummary(
    ipo.bid_price,
    allotment?.allotted_shares || 0,
    ipoSales
  );

  return {
    ...ipo,
    allotment,
    sales: ipoSales,
    salesSummary,
  };
}

/**
 * Creates a new IPO application.
 */
export async function createIpoApplication(userId, ipoData) {
  if (!userId) throw new Error('User ID is required');

  const payload = {
    user_id: userId,
    company_name: ipoData.company_name.trim(),
    symbol: ipoData.symbol.toUpperCase().trim(),
    application_no: ipoData.application_no?.trim() || null,
    category: ipoData.category || 'retail',
    demat_account: ipoData.demat_account?.trim() || null,
    bid_price: Number(ipoData.bid_price),
    lot_size: parseInt(ipoData.lot_size, 10),
    lots_applied: parseInt(ipoData.lots_applied, 10) || 1,
    total_shares_applied: parseInt(ipoData.total_shares_applied, 10),
    application_amount: Number(ipoData.application_amount),
    application_date: ipoData.application_date || new Date().toISOString().split('T')[0],
    upi_or_asba: ipoData.upi_or_asba?.trim() || null,
    bank_name: ipoData.bank_name?.trim() || null,
    status: ipoData.status || 'applied',
  };

  const { data, error } = await supabase
    .from('ipo_applications')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing IPO application.
 */
export async function updateIpoApplication(ipoId, userId, ipoData) {
  if (!ipoId || !userId) throw new Error('IPO ID and User ID are required');

  const payload = {
    company_name: ipoData.company_name.trim(),
    symbol: ipoData.symbol.toUpperCase().trim(),
    application_no: ipoData.application_no?.trim() || null,
    category: ipoData.category || 'retail',
    demat_account: ipoData.demat_account?.trim() || null,
    bid_price: Number(ipoData.bid_price),
    lot_size: parseInt(ipoData.lot_size, 10),
    lots_applied: parseInt(ipoData.lots_applied, 10),
    total_shares_applied: parseInt(ipoData.total_shares_applied, 10),
    application_amount: Number(ipoData.application_amount),
    application_date: ipoData.application_date,
    upi_or_asba: ipoData.upi_or_asba?.trim() || null,
    bank_name: ipoData.bank_name?.trim() || null,
    status: ipoData.status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ipo_applications')
    .update(payload)
    .eq('id', ipoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes an IPO application.
 */
export async function deleteIpoApplication(ipoId, userId) {
  if (!ipoId || !userId) throw new Error('IPO ID and User ID are required');

  const { error } = await supabase
    .from('ipo_applications')
    .delete()
    .eq('id', ipoId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

/**
 * Saves or updates allotment details for an IPO.
 */
export async function saveAllotmentDetails(ipoId, userId, allotmentData) {
  if (!ipoId || !userId) throw new Error('IPO ID and User ID are required');

  const payload = {
    ipo_id: ipoId,
    user_id: userId,
    allotted_shares: parseInt(allotmentData.allotted_shares, 10) || 0,
    allotted_amount: Number(allotmentData.allotted_amount) || 0,
    refund_amount: Number(allotmentData.refund_amount) || 0,
    allotment_date: allotmentData.allotment_date || null,
    updated_at: new Date().toISOString(),
  };

  // Upsert into ipo_allotments
  const { data, error } = await supabase
    .from('ipo_allotments')
    .upsert(payload, { onConflict: 'ipo_id' })
    .select()
    .single();

  if (error) throw error;

  // Also update application status accordingly if appropriate
  let newStatus = 'applied';
  if (payload.allotted_shares > 0) {
    newStatus = 'allotted';
  } else if (payload.refund_amount > 0 || allotmentData.isNotAllotted) {
    newStatus = 'not_allotted';
  }

  await supabase
    .from('ipo_applications')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ipoId)
    .eq('user_id', userId);

  return data;
}

/**
 * Saves listing details for an IPO (listing price, listing date, high/low).
 */
export async function saveListingDetails(ipoId, userId, listingData) {
  if (!ipoId || !userId) throw new Error('IPO ID and User ID are required');

  const payload = {
    listing_date: listingData.listing_date || null,
    listing_price: listingData.listing_price ? Number(listingData.listing_price) : null,
    listing_day_high: listingData.listing_day_high ? Number(listingData.listing_day_high) : null,
    listing_day_low: listingData.listing_day_low ? Number(listingData.listing_day_low) : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ipo_allotments')
    .update(payload)
    .eq('ipo_id', ipoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  // Mark status as 'listed' if listing price provided
  if (payload.listing_price) {
    await supabase
      .from('ipo_applications')
      .update({ status: 'listed', updated_at: new Date().toISOString() })
      .eq('id', ipoId)
      .eq('user_id', userId);
  }

  return data;
}

/**
 * Records an IPO share sale as a transaction.
 */
export async function recordIpoSale(ipo, userId, saleData) {
  if (!ipo || !userId) throw new Error('IPO details and User ID are required');

  const qty = parseInt(saleData.quantity, 10);
  const price = Number(saleData.price);
  const charges = Number(saleData.brokerage_charges || 0);
  const totalAmount = qty * price;

  const payload = {
    user_id: userId,
    ipo_id: ipo.id,
    asset_type: 'ipo',
    transaction_type: 'sell',
    symbol: ipo.symbol,
    company_name: ipo.company_name,
    quantity: qty,
    price,
    brokerage_charges: charges,
    total_amount: totalAmount,
    transaction_date: saleData.transaction_date || new Date().toISOString().split('T')[0],
    notes: saleData.notes?.trim() || `IPO listing gain / share sale for ${ipo.company_name}`,
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
 * Deletes a recorded IPO share sale transaction.
 */
export async function deleteIpoSale(transactionId, userId) {
  if (!transactionId || !userId) throw new Error('Transaction ID and User ID are required');

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}
