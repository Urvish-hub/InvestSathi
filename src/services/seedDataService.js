/**
 * Demo Data Seeder for InvestSathi
 * Allows users to seed real database records into their Supabase instance for instant testing.
 */
import { supabase } from '../lib/supabaseClient.js';

export async function seedDemoData(userId) {
  if (!userId) throw new Error('User ID is required to seed data');

  // 1. Create Sample IPO 1: Premier Energies (Allotted and Listed with gain)
  const { data: ipo1, error: err1 } = await supabase
    .from('ipo_applications')
    .insert([{
      user_id: userId,
      company_name: 'Premier Energies Limited',
      symbol: 'PREMIERENE',
      application_no: 'ASBA-2026-98124',
      category: 'retail',
      demat_account: '1208160012345678',
      bid_price: 450.00,
      lot_size: 33,
      lots_applied: 1,
      total_shares_applied: 33,
      application_amount: 14850.00,
      application_date: '2026-08-27',
      upi_or_asba: 'investor@okhdfcbank',
      bank_name: 'HDFC Bank',
      status: 'listed',
    }])
    .select()
    .single();

  if (err1) throw err1;

  // Insert Allotment for IPO 1
  await supabase
    .from('ipo_allotments')
    .insert([{
      ipo_id: ipo1.id,
      user_id: userId,
      allotted_shares: 33,
      allotted_amount: 14850.00,
      refund_amount: 0.00,
      allotment_date: '2026-08-30',
      listing_date: '2026-09-03',
      listing_price: 991.00,
      listing_day_high: 994.00,
      listing_day_low: 850.00,
    }]);

  // Insert Sale for IPO 1 (Sold 20 shares at 980)
  await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      ipo_id: ipo1.id,
      asset_type: 'ipo',
      transaction_type: 'sell',
      symbol: 'PREMIERENE',
      company_name: 'Premier Energies Limited',
      quantity: 20,
      price: 980.00,
      brokerage_charges: 25.00,
      total_amount: 19600.00,
      transaction_date: '2026-09-03',
      notes: 'Listing day partial profit booking (20 of 33 shares)',
    }]);

  // 2. Create Sample IPO 2: Bajaj Housing Finance (Allotted, Holding)
  const { data: ipo2, error: err2 } = await supabase
    .from('ipo_applications')
    .insert([{
      user_id: userId,
      company_name: 'Bajaj Housing Finance Limited',
      symbol: 'BAJAJHFL',
      application_no: 'ASBA-2026-44391',
      category: 'retail',
      demat_account: '1208160012345678',
      bid_price: 70.00,
      lot_size: 214,
      lots_applied: 1,
      total_shares_applied: 214,
      application_amount: 14980.00,
      application_date: '2026-09-09',
      upi_or_asba: 'investor@okhdfcbank',
      bank_name: 'HDFC Bank',
      status: 'listed',
    }])
    .select()
    .single();

  if (err2) throw err2;

  await supabase
    .from('ipo_allotments')
    .insert([{
      ipo_id: ipo2.id,
      user_id: userId,
      allotted_shares: 214,
      allotted_amount: 14980.00,
      refund_amount: 0.00,
      allotment_date: '2026-09-12',
      listing_date: '2026-09-16',
      listing_price: 150.00,
      listing_day_high: 165.00,
      listing_day_low: 146.00,
    }]);

  // 3. Create Sample IPO 3: Waaree Energies (Applied, pending)
  await supabase
    .from('ipo_applications')
    .insert([{
      user_id: userId,
      company_name: 'Waaree Energies Limited',
      symbol: 'WAAREEENER',
      application_no: 'ASBA-2026-77812',
      category: 'retail',
      demat_account: '1208160012345678',
      bid_price: 1503.00,
      lot_size: 9,
      lots_applied: 1,
      total_shares_applied: 9,
      application_amount: 13527.00,
      application_date: '2026-10-21',
      upi_or_asba: 'investor@okhdfcbank',
      bank_name: 'HDFC Bank',
      status: 'applied',
    }]);

  // 4. Create Sample Stock Transactions
  // HDFC Bank Buy
  await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      asset_type: 'stock',
      transaction_type: 'buy',
      symbol: 'HDFCBANK',
      company_name: 'HDFC Bank Limited',
      quantity: 15,
      price: 1650.00,
      brokerage_charges: 20.00,
      total_amount: 24770.00,
      transaction_date: '2026-05-14',
      notes: 'Long term compounder accumulation',
    }]);

  // Tata Motors Buy & Partial Sell
  await supabase
    .from('transactions')
    .insert([
      {
        user_id: userId,
        asset_type: 'stock',
        transaction_type: 'buy',
        symbol: 'TATAMOTORS',
        company_name: 'Tata Motors Limited',
        quantity: 30,
        price: 880.00,
        brokerage_charges: 25.00,
        total_amount: 26425.00,
        transaction_date: '2026-06-10',
        notes: 'EV portfolio allocation',
      },
      {
        user_id: userId,
        asset_type: 'stock',
        transaction_type: 'sell',
        symbol: 'TATAMOTORS',
        company_name: 'Tata Motors Limited',
        quantity: 10,
        price: 1020.00,
        brokerage_charges: 20.00,
        total_amount: 10180.00,
        transaction_date: '2026-08-15',
        notes: 'Partial profit booking at milestone',
      }
    ]);

  return true;
}
