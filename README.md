# 📈 Stock Data Warehouse — "Big Bull"

> A full-stack **stock market intelligence platform** for Indian equities — built with Node.js, MySQL and React.

---

## 🧭 What Is This?

Stock Data Warehouse is a **personal Bloomberg Terminal** for Indian stocks. It:

- 📥 **Fetches** live data from the IndianAPI (prices, profiles, news)
- 🗄️ **Stores** everything locally in a MySQL database (zero repeat API calls after first load)
- 📊 **Visualises** it through a modern dark-theme React dashboard
- 🔍 **Screens** stocks using 15+ financial & technical filters
- 🧮 **Analyses** data using advanced SQL — Window Functions, Views, Stored Procedures

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Database** | MySQL 8.0 |
| **Backend** | Node.js 18 + Express |
| **Frontend** | React 18 (Vite) |
| **Styling** | Tailwind CSS (utility classes) + Vanilla CSS |
| **External Data** | [IndianAPI](https://stock.indianapi.in) |
| **HTTP** | `undici` (backend), `axios` (frontend) |

---

## 🗃️ Database Schema

7 tables + 1 View + 1 Stored Procedure:

```
exchanges              → Stock exchanges (NSE, BSE)
companies              → 22 tracked Indian stocks + cached profile JSON
stock_prices           → Daily OHLCV candles (1 year per company)
technical_indicators   → MA50, MA200, RSI per company per day
market_news            → News headlines
trades                 → Buy/sell trade records
corporate_actions      → Dividends, splits (schema ready)

vw_screener_base       → VIEW: pre-joins companies + prices + indicators
sp_refresh_technicals  → PROCEDURE: recalculates MA50/MA200/RSI from raw data
```

### Key Design Decisions
- `profile_data JSON` column stores the full IndianAPI response (avoids 50+ extra columns)
- `UNIQUE KEY (company_id, timestamp, span)` on `stock_prices` prevents duplicates
- `BIGINT` primary keys for price/indicator tables — they grow fast
- `DECIMAL(10,2)` for prices — avoids floating-point rounding errors
- Indexes on `(company_id, timestamp)` make time-series queries fast

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8.0+ running locally

### 1 — Database Setup

```bash
mysql -u root -p < backend/schema.sql
```

Or open `backend/schema.sql` in MySQL Workbench and execute it.

### 2 — Backend Setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=stock_data_warehouse
INDIAN_API_KEY=your_api_key_here
```

Start the backend:

```bash
npm run dev
# Server runs on http://localhost:5000
```

### 3 — Run the DB Migration (one-time)

Creates the `vw_screener_base` View and `sp_refresh_technicals` Stored Procedure:

```bash
node migrations/run_migration.js
```

### 4 — Seed Companies (optional but recommended)

Adds 20 Nifty 50 companies with full profile + historical data:

```bash
node seed_nifty20.js
```

> ⚠️ This makes ~3 API calls per company. Make sure you have sufficient IndianAPI credits.

### 5 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

---

## 📱 Features & Pages

### Dashboard
Home screen — lists all tracked companies with live price and 1-day change.

### Company Detail ⭐
Full financial deep-dive for a single stock:
- P/E Ratio, Market Cap, ROE, 52W High/Low — parsed from cached JSON
- Interactive candlestick price chart (1yr history)
- MA50, MA200, RSI overlays
- Analyst buy/hold/sell sentiment
- Latest news feed

### Stock Screener ⭐
Filter stocks by 15+ criteria simultaneously:

| Category | Filters |
|---|---|
| Price & Volume | Min/Max price, Min/Max volume |
| Returns | 1-Day %, 30-Day % change |
| Fundamentals | ROE, Debt/Equity, Net Profit Margin, Revenue Growth 5Y |
| Size | Market Cap range |
| Momentum | Distance from 52W High, Price vs 50DMA |
| Category | Sector |
| Signals | Golden Cross, Death Cross, Volume Spike, Near 52W High/Low |

### Analytics — Advanced SQL ⭐
5 panels powered by distinct SQL techniques:

| Panel | SQL Feature |
|---|---|
| Sector Heatmap | `GROUP BY sector, AVG(), GROUP_CONCAT()` |
| Sector Rankings | `RANK() OVER (PARTITION BY sector ORDER BY change_pct)` |
| Streak Detector | `LAG(close_price) OVER (PARTITION BY company_id ORDER BY timestamp)` |
| DB Objects | `SELECT FROM information_schema.VIEWS / ROUTINES` |
| Refresh Technicals | `CALL sp_refresh_technicals(company_id)` |

### Research
Market news + price chart exploration across multiple time frames.

### Add Company
Add any NSE/BSE-listed stock by ticker. One form submission triggers:
1. Company record creation (DB)
2. Full profile cache (IndianAPI → `profile_data` column)
3. 1-year historical prices (→ `stock_prices` table)
4. News fetch (→ `market_news` table)

---


## 🔄 Data Flow

```
Add Company
  └─ POST /api/companies           → creates DB record
  └─ POST /api/external/profile    → fetches + caches JSON blob
  └─ POST /api/external/historical → populates stock_prices + technical_indicators
  └─ POST /api/external/news       → populates market_news

View Company Page
  └─ GET /api/companies/:symbol    → reads from DB (zero API calls)
  └─ GET /api/stocks/:id           → reads stock_prices from DB

Run Screener
  └─ GET /api/screener?filters...
       ├─ Pre-query: JSON_EXTRACT financials from profile_data
       ├─ Main query: filters applied via vw_screener_base
       └─ JS merge: ranks computed, results returned
```

---

## 🧮 DBMS Concepts Demonstrated

| Concept | Where |
|---|---|
| Normalisation (3NF) | 7 tables with foreign keys |
| Referential Integrity | `FOREIGN KEY` constraints throughout |
| Indexing | `idx_stock_time`, `idx_indicator_time`, `idx_trade_time` |
| JSON data type | `profile_data` column in `companies` |
| Aggregate Functions | `AVG()`, `MAX()`, `MIN()`, `COUNT()`, `SUM()` |
| Correlated Subqueries | Latest price per company in screener JOINs |
| Window Functions | `RANK()`, `DENSE_RANK()`, `LAG()` in analytics |
| Database Views | `vw_screener_base` — abstraction over complex JOINs |
| Stored Procedures | `sp_refresh_technicals` — procedural SQL in DB engine |
| UPSERT | `INSERT ... ON DUPLICATE KEY UPDATE` |
| GROUP_CONCAT | Best/worst performer per sector in heatmap |
| information_schema | Live inventory of DB objects |
| Connection Pooling | `mysql2` pool in `config/db.js` |
| Parameterised Queries | All queries use `?` placeholders (SQL injection safe) |

---

## 📁 Project Structure

```
Stock-Data-Warehouse/
├── backend/
│   ├── server.js                  # Express entry point
│   ├── schema.sql                 # Database DDL
│   ├── .env                       # Secrets (not in git)
│   ├── seed_nifty20.js            # Seeds 20 companies
│   ├── config/db.js               # MySQL pool
│   ├── middleware/errorHandler.js
│   ├── controllers/
│   │   ├── companyController.js   # CRUD for companies table
│   │   ├── stockController.js     # Historical price queries
│   │   ├── externalController.js  # IndianAPI integration + caching
│   │   ├── screenerController.js  # Dynamic filter query builder
│   │   └── analyticsController.js # Window functions, heatmap, procedures
│   ├── routes/                    # URL → controller mappings
│   └── migrations/
│       ├── run_migration.js       # Creates VIEW + PROCEDURE
│       └── check_sector.js        # Backfills sector data from JSON
└── frontend/
    └── src/
        ├── App.jsx                # React Router routes
        ├── components/Layout.jsx  # Navigation bar
        ├── services/api.js        # Centralised API calls
        └── pages/
            ├── Dashboard.jsx
            ├── CompanyDetail.jsx  # Rich stock detail page
            ├── Screener.jsx       # Multi-filter stock screener
            ├── Analytics.jsx      # Advanced SQL showcase
            ├── Research.jsx
            ├── TradeData.jsx
            └── AddCompany.jsx
```

---

## 📊 Current Data

| Metric | Value |
|---|---|
| Companies tracked | 22 |
| Distinct sectors | 13 |
| Screener filters | 15+ |
| Analytics SQL techniques | 5 |
| DB Tables | 7 |
| DB Views | 1 |
| Stored Procedures | 1 |
| API calls per page view (after seeding) | **0** |

---

## 📄 License

This project is for educational/academic use — DBMS coursework project.
