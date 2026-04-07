# Stock Data Warehouse System

A full-stack project built with Node.js/Express, MySQL, React.js, and Tailwind CSS.
This system acts as a stock data warehouse, allowing you to track companies, view their historical prices with interactive charts, and monitor simulated market trades.

## Prerequisites

- Node.js installed (v16+)
- MySQL Server installed and running

## 1. Database Setup

1. Open your MySQL client or command line.
2. Run the SQL script provided in `backend/schema.sql`:

```sql
source backend/schema.sql;
```

Alternatively, copy the contents of `backend/schema.sql` into your database UI tool (like phpMyAdmin or MySQL Workbench) and execute it to create the database and tables.

## 2. Backend Setup

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to a new `.env` file (or rename it) and update your MySQL password:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=stock_data_warehouse
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   # OR
   node server.js
   ```
   *The backend will run on http://localhost:5000*

## 3. Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on http://localhost:5173 (or another port provided by Vite).*

## Usage

1. Open the frontend URL in your browser.
2. Navigate to **Add Company**. 
3. Fill in the details (e.g., Apple Inc., AAPL). Submitting the form will create the company AND fetch 30 days of mock stock data simulating daily OHLCV prices.
4. Go to the **Dashboard** to see the company listed.
5. Click on **View Details** to see the company's interactive stock chart, technical indicators template, and the tabular log of recent daily quotes.
