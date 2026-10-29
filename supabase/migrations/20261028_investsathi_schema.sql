-- ==============================================================================
-- InvestSathi: Complete PostgreSQL Database Schema & Security Migrations
-- Target: Supabase PostgreSQL with Row Level Security (RLS)
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing triggers if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ==============================================================================
-- TABLE: profiles
-- Stores user preferences, demat/PAN identifiers, and financial year settings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    demat_account_no TEXT,
    pan_number TEXT,
    preferred_currency TEXT DEFAULT '₹',
    financial_year_start TEXT DEFAULT '04-01',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- TABLE: ipo_applications
-- Stores manual IPO bids, lot sizes, category, application dates and statuses
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ipo_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    application_no TEXT,
    category TEXT NOT NULL DEFAULT 'retail' CHECK (category IN ('retail', 'hni', 'shareholder', 'employee')),
    demat_account TEXT,
    bid_price NUMERIC(14, 2) NOT NULL CHECK (bid_price >= 0),
    lot_size INTEGER NOT NULL CHECK (lot_size > 0),
    lots_applied INTEGER NOT NULL DEFAULT 1 CHECK (lots_applied > 0),
    total_shares_applied INTEGER NOT NULL CHECK (total_shares_applied > 0),
    application_amount NUMERIC(14, 2) NOT NULL CHECK (application_amount >= 0),
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    upi_or_asba TEXT,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'allotted', 'not_allotted', 'listed', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- TABLE: ipo_allotments
-- Stores allotment result, actual allotted shares, listing price and listing date
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ipo_allotments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id UUID NOT NULL UNIQUE REFERENCES public.ipo_applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allotted_shares INTEGER NOT NULL DEFAULT 0 CHECK (allotted_shares >= 0),
    allotted_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (allotted_amount >= 0),
    refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (refund_amount >= 0),
    allotment_date DATE,
    listing_date DATE,
    listing_price NUMERIC(14, 2) CHECK (listing_price IS NULL OR listing_price >= 0),
    listing_day_high NUMERIC(14, 2) CHECK (listing_day_high IS NULL OR listing_day_high >= 0),
    listing_day_low NUMERIC(14, 2) CHECK (listing_day_low IS NULL OR listing_day_low >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- TABLE: transactions
-- Unified ledger for stock trades and IPO share sales with fees and cost-basis
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ipo_id UUID REFERENCES public.ipo_applications(id) ON DELETE SET NULL,
    asset_type TEXT NOT NULL DEFAULT 'stock' CHECK (asset_type IN ('stock', 'ipo')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    symbol TEXT NOT NULL,
    company_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
    brokerage_charges NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (brokerage_charges >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & FAST FILTERING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_ipo_applications_user_status ON public.ipo_applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ipo_applications_user_date ON public.ipo_applications(user_id, application_date DESC);
CREATE INDEX IF NOT EXISTS idx_ipo_allotments_user ON public.ipo_allotments(user_id);
CREATE INDEX IF NOT EXISTS idx_ipo_allotments_ipo ON public.ipo_allotments(ipo_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_symbol ON public.transactions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ipo_id ON public.transactions(ipo_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user-ownership isolation across all CRUD operations
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipo_allotments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. IPO Applications Policies
CREATE POLICY "Users can select their own IPO applications"
    ON public.ipo_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IPO applications"
    ON public.ipo_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IPO applications"
    ON public.ipo_applications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IPO applications"
    ON public.ipo_applications FOR DELETE
    USING (auth.uid() = user_id);

-- 3. IPO Allotments Policies
CREATE POLICY "Users can select their own IPO allotments"
    ON public.ipo_allotments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IPO allotments"
    ON public.ipo_allotments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IPO allotments"
    ON public.ipo_allotments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IPO allotments"
    ON public.ipo_allotments FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Transactions Policies
CREATE POLICY "Users can select their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE INITIALIZATION TRIGGER
-- Initializes a public.profiles row automatically when a user signs up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- AUTOMATIC updated_at TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_ipo_applications_updated_at ON public.ipo_applications;
CREATE TRIGGER set_ipo_applications_updated_at
    BEFORE UPDATE ON public.ipo_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_ipo_allotments_updated_at ON public.ipo_allotments;
CREATE TRIGGER set_ipo_allotments_updated_at
    BEFORE UPDATE ON public.ipo_allotments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
