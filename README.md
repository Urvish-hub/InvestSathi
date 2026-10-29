# InvestSathi — Personal IPO & Stock Investment Tracker

InvestSathi is a mobile-first, high-precision personal finance web application and Android APK foundation designed to track IPO bids, allotment results, listing day performance, stock portfolio holdings, capital gains, and comprehensive portfolio analytics.

Built with **React JS**, **Vite**, **@supabase/supabase-js**, and structured for **Capacitor** packaging into native Android APKs.

---

## 1. Features Overview

### Supabase Authentication
- **Developer-Configured Backend**: Seamless out-of-the-box user experience. Users do not need to enter Supabase credentials; the app initializes automatically using developer environment variables.
- **Email & Password Authentication**: Complete validation for sign-up, sign-in, and sign-out flows.
- **Session Persistence**: Automatic token refresh and session restoration on reload across mobile and web.
- **Password Recovery**: Forgot-password email dispatch and authenticated password reset.
- **Protected Routing**: Non-authenticated requests automatically route to Login; authenticated sessions are shielded from auth pages.
- **User Isolation**: Automatic user profile initialization on sign-up via PostgreSQL triggers with Row Level Security (RLS).

### IPO Application & Lifecycle Tracking
- **Bid Calculation**: Automatic calculation of lot sizes, total shares, and ASBA blocked application capital.
- **Category Support**: Retail (RII), HNI (sHNI/bHNI), Shareholder, and Employee quotas.
- **Cut-off Price Switch**: Rapidly set bid prices at issue upper price bands.
- **Allotment Outcome**:
  - Full, partial, or zero allotment tracking.
  - **Accounting Strictness**: Application amount is *never* treated as invested capital; only allotted shares multiplied by bid price count towards portfolio holdings. Unallotted capital is calculated as released refund.
- **Listing Day Performance**: Record official exchange listing price, day high/low, and gross listing gains (₹ and %).
- **IPO Share Sales**: Record partial or complete sale of allotted shares with net realized P&L calculation after brokerage fees.

### Stock Portfolio & Cost-Basis Accounting
- **Weighted Average Cost Basis (WACB)**: Standardized financial accounting for multiple buy and partial sell lots.
- **Manual Market Pricing**: In compliance with specifications, market prices are user-managed (no live scrape/brokerage feeds). Manual prices are clearly labeled.
- **Real-time Metrics**: Invested capital, current valuation, unrealized gain/loss %, and historical realized profits.

### Portfolio & Investment Analytics
- **Performance Breakdown**: Track overall portfolio value, total realized profit/loss, and unrealized gains across all asset types.
- **Asset Allocation**: Visual pie charts showing capital distribution between Stocks and IPO investments.
- **Historical Analysis**: Monthly and yearly performance series and capital deployment timelines.
- **Performance Rankings**: Identify best and worst-performing investments sorted by P&L, returns percentage, or capital invested.
- **Period Filtering**: Filter analytics by All Time, specific financial years, current month, or custom date ranges.
- **Comprehensive Reporting**: Export reports directly to formatted PDF or download granular transaction and monthly performance CSV files.

### Unified Transaction History & Ledger
- Multi-asset support (Stocks and IPO share sales).
- Filters for Buy, Sell, and IPO sales.
- Search by ticker symbol or company name.
- Single-click CSV ledger export.

### Financial Reports & Scorecard
- Realized P&L breakdown by asset class.
- **IPO Win-Rate Scorecard**: Allotment success percentage, ASBA blocked capital vs actual deployed funds, and listing day gains.
- **Capital Gains Tax Estimation**: Short-term capital gains (STCG < 365 days) vs Long-term capital gains (LTCG ≥ 365 days).
- Comprehensive JSON report export.

---

## 2. Environment Configuration

1. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

2. Configure your Supabase project credentials (obtain these from your Supabase Dashboard under **Project Settings -> API**):
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> **Security Note:** NEVER provide the `service_role` key to the frontend or mobile application. Only the `anon` / `publishable` public key is permitted.

---

## 3. Database Schema & SQL Migrations

InvestSathi relies on 4 PostgreSQL tables with **Row Level Security (RLS)** enabled on all tables:

1. `profiles`: User information, demat account, PAN notes, currency, and financial year start.
2. `ipo_applications`: IPO bids, lot sizes, application dates, and statuses.
3. `ipo_allotments`: Allotment shares, refund amounts, and listing day prices.
4. `transactions`: Stock buy/sell trades and IPO listing day sales.

### How to Run Migrations in Supabase
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to **SQL Editor** on the left menu.
3. Open the file `/supabase/migrations/20261028_investsathi_schema.sql` (or copy it directly inside the app from **Profile & Settings -> Copy SQL Schema**).
4. Paste the SQL into the Supabase SQL editor and click **Run**.
5. All tables, foreign key constraints, performance indexes, RLS policies, and user initialization triggers will be created.

---

## 4. Running the Application & Tests

### Start Local Development Server
```bash
npm run dev
```
The server will run on `http://localhost:3000` (or `http://localhost:5173`).

### Run Unit Tests
The application includes unit tests for financial mathematics (WACB, IPO calculations, allotment refunds) and authentication flows:
```bash
npx --yes tsx --test src/utils/*.test.ts
```

### Production Build
```bash
npm run build
```

---

## 5. Capacitor Android APK Packaging & Sync

InvestSathi is architected for seamless Android mobile compilation with safe-area insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`), responsive touch controls, and bottom navigation:

1. Install Capacitor CLI and dependencies (if not already installed):
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

2. Sync web build to the Android project:
```bash
npm run build
npx cap sync android
```

3. Open in Android Studio to run on an emulator or connected physical Android device:
```bash
npx cap open android
```
