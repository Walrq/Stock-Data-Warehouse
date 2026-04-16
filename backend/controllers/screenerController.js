const db = require('../config/db');

// @desc    Run stock screener with custom filters
// @route   GET /api/screener
const runScreener = async (req, res, next) => {
    try {
        const {
            min_price, max_price,
            min_volume, max_volume,
            min_change_1d, max_change_1d,
            min_change_30d,
            sector,
            min_market_cap, max_market_cap,
            min_roe, max_roe,
            min_debt_equity, max_debt_equity,
            min_net_margin, max_net_margin,
            min_revenue_growth, max_revenue_growth,
            max_dist_52w_high,
            min_price_vs_50dma,
            max_price_vs_50dma,
            signal,
            sort_by = 'company_name',
            sort_order = 'ASC'
        } = req.query;

        const allowedSorts = [
            'company_name', 'ticker',
            'latest_close', 'latest_volume',
            'change_1d_pct', 'change_30d_pct',
            'market_cap', 'ma_50', 'ma_200',
            'roe', 'debt_equity', 'net_margin', 'revenue_growth', 'dist_52w_high_pct'
        ];
        const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'company_name';
        const safeOrder = sort_order === 'DESC' ? 'DESC' : 'ASC';

        // ── Step 1: Pre-extract financials from profile_data JSON in a separate query.
        //    This keeps the big JSON blob OUT of the sort buffer entirely.
        const [financialRows] = await db.query(`
            SELECT
                company_id,
                -- ROE: mgmtEffectiveness – "Return on average equity - most recent fiscal year"
                CAST(JSON_UNQUOTE(JSON_EXTRACT(profile_data, '$."keyMetrics"."mgmtEffectiveness"[11]."value"')) AS DECIMAL(10,2)) AS roe,
                -- Debt/Equity: financialstrength – "Total debt/total equity - most recent fiscal year"
                CAST(JSON_UNQUOTE(JSON_EXTRACT(profile_data, '$."keyMetrics"."financialstrength"[12]."value"')) AS DECIMAL(10,2)) AS debt_equity,
                -- Net Margin TTM: margins – "Net Profit Margin % - trailing 12 month"
                CAST(JSON_UNQUOTE(JSON_EXTRACT(profile_data, '$."keyMetrics"."margins"[6]."value"'))  AS DECIMAL(10,2)) AS net_margin,
                -- Revenue Growth 5yr: growth – "Revenue growth rate, 5 year"
                CAST(JSON_UNQUOTE(JSON_EXTRACT(profile_data, '$."keyMetrics"."growth"[1]."value"'))   AS DECIMAL(10,2)) AS revenue_growth,
                -- Free Cash Flow MRY: financialstrength – "Free Cash Flow - most recent fiscal year"
                CAST(JSON_UNQUOTE(JSON_EXTRACT(profile_data, '$."keyMetrics"."financialstrength"[4]."value"')) AS DECIMAL(20,2)) AS free_cash_flow
            FROM companies
            WHERE profile_data IS NOT NULL
        `);

        // Build a map: company_id -> financials
        const finMap = new Map(financialRows.map(r => [r.company_id, r]));

        // ── Step 2: Main screener query – NO JSON columns, no sort buffer issue.
        let query = `
            SELECT
                c.company_id,
                c.ticker,
                c.company_name,
                c.sector,
                c.market_cap,

                sp_latest.close_price        AS latest_close,
                sp_latest.volume             AS latest_volume,
                sp_latest.timestamp          AS latest_date,

                ROUND(((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price) * 100, 2) AS change_1d_pct,
                ROUND(((sp_latest.close_price - sp_30d.close_price)  / sp_30d.close_price)  * 100, 2) AS change_30d_pct,

                sp_52w.high_52w,
                sp_52w.low_52w,

                ROUND(((sp_latest.close_price - sp_52w.high_52w) / sp_52w.high_52w) * 100, 2) AS dist_52w_high_pct,
                ROUND(((sp_latest.close_price - ti.ma_50)         / ti.ma_50)         * 100, 2) AS price_vs_50dma_pct,

                sp_avg.avg_volume_30d,
                ti.ma_50,
                ti.ma_200,
                ti.rsi

            FROM companies c

            JOIN stock_prices sp_latest ON sp_latest.price_id = (
                SELECT price_id FROM stock_prices
                WHERE company_id = c.company_id AND span = '1day'
                ORDER BY timestamp DESC LIMIT 1
            )
            LEFT JOIN stock_prices sp_prev ON sp_prev.price_id = (
                SELECT price_id FROM stock_prices
                WHERE company_id = c.company_id AND span = '1day'
                ORDER BY timestamp DESC LIMIT 1 OFFSET 1
            )
            LEFT JOIN stock_prices sp_30d ON sp_30d.price_id = (
                SELECT price_id FROM stock_prices
                WHERE company_id = c.company_id AND span = '1day'
                ORDER BY timestamp DESC LIMIT 1 OFFSET 29
            )
            LEFT JOIN (
                SELECT company_id, MAX(high_price) AS high_52w, MIN(low_price) AS low_52w
                FROM stock_prices
                WHERE span = '1day' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
                GROUP BY company_id
            ) sp_52w ON sp_52w.company_id = c.company_id
            LEFT JOIN (
                SELECT company_id, AVG(volume) AS avg_volume_30d
                FROM stock_prices
                WHERE span = '1day' AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY company_id
            ) sp_avg ON sp_avg.company_id = c.company_id
            LEFT JOIN technical_indicators ti ON ti.indicator_id = (
                SELECT indicator_id FROM technical_indicators
                WHERE company_id = c.company_id
                ORDER BY timestamp DESC LIMIT 1
            )

            WHERE 1=1
        `;

        const params = [];

        if (min_price) { query += ' AND sp_latest.close_price >= ?'; params.push(Number(min_price)); }
        if (max_price) { query += ' AND sp_latest.close_price <= ?'; params.push(Number(max_price)); }

        if (min_volume) { query += ' AND sp_latest.volume >= ?'; params.push(Number(min_volume)); }
        if (max_volume) { query += ' AND sp_latest.volume <= ?'; params.push(Number(max_volume)); }

        if (min_change_1d) {
            query += ' AND ((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price) * 100 >= ?';
            params.push(Number(min_change_1d));
        }
        if (max_change_1d) {
            query += ' AND ((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price) * 100 <= ?';
            params.push(Number(max_change_1d));
        }
        if (min_change_30d) {
            query += ' AND ((sp_latest.close_price - sp_30d.close_price) / sp_30d.close_price) * 100 >= ?';
            params.push(Number(min_change_30d));
        }

        if (sector) { query += ' AND c.sector = ?'; params.push(sector); }

        if (min_market_cap) { query += ' AND c.market_cap >= ?'; params.push(Number(min_market_cap)); }
        if (max_market_cap) { query += ' AND c.market_cap <= ?'; params.push(Number(max_market_cap)); }

        if (signal) {
            switch (signal) {
                case 'price_above_ma50':   query += ' AND sp_latest.close_price > ti.ma_50'; break;
                case 'price_below_ma50':   query += ' AND sp_latest.close_price < ti.ma_50'; break;
                case 'price_above_ma200':  query += ' AND sp_latest.close_price > ti.ma_200'; break;
                case 'golden_cross':       query += ' AND ti.ma_50 > ti.ma_200'; break;
                case 'death_cross':        query += ' AND ti.ma_50 < ti.ma_200'; break;
                case 'near_52w_high':      query += ' AND sp_latest.close_price >= sp_52w.high_52w * 0.95'; break;
                case 'near_52w_low':       query += ' AND sp_latest.close_price <= sp_52w.low_52w * 1.05'; break;
                case 'volume_spike':       query += ' AND sp_latest.volume > sp_avg.avg_volume_30d * 2'; break;
            }
        }

        query += ` ORDER BY ${safeSort} ${safeOrder}`;

        const [rows] = await db.query(query, params);

        // ── Step 3: Merge financials + apply financial filters in JS (avoids sort buffer issue).
        let enriched = rows.map(r => {
            const fin = finMap.get(r.company_id) || {};
            return {
                ...r,
                roe:            fin.roe            ?? null,
                debt_equity:    fin.debt_equity    ?? null,
                net_margin:     fin.net_margin     ?? null,
                revenue_growth: fin.revenue_growth ?? null,
                free_cash_flow: fin.free_cash_flow ?? null,
            };
        });

        // Apply financial filters in JS
        if (min_roe)           enriched = enriched.filter(r => r.roe            != null && r.roe            >= Number(min_roe));
        if (max_roe)           enriched = enriched.filter(r => r.roe            != null && r.roe            <= Number(max_roe));
        if (min_debt_equity)   enriched = enriched.filter(r => r.debt_equity    != null && r.debt_equity    >= Number(min_debt_equity));
        if (max_debt_equity)   enriched = enriched.filter(r => r.debt_equity    != null && r.debt_equity    <= Number(max_debt_equity));
        if (min_net_margin)    enriched = enriched.filter(r => r.net_margin     != null && r.net_margin     >= Number(min_net_margin));
        if (max_net_margin)    enriched = enriched.filter(r => r.net_margin     != null && r.net_margin     <= Number(max_net_margin));
        if (min_revenue_growth) enriched = enriched.filter(r => r.revenue_growth != null && r.revenue_growth >= Number(min_revenue_growth));
        if (max_revenue_growth) enriched = enriched.filter(r => r.revenue_growth != null && r.revenue_growth <= Number(max_revenue_growth));
        if (max_dist_52w_high) enriched = enriched.filter(r => r.dist_52w_high_pct != null && r.dist_52w_high_pct >= -Math.abs(Number(max_dist_52w_high)));
        if (min_price_vs_50dma) enriched = enriched.filter(r => r.price_vs_50dma_pct != null && r.price_vs_50dma_pct >= Number(min_price_vs_50dma));
        if (max_price_vs_50dma) enriched = enriched.filter(r => r.price_vs_50dma_pct != null && r.price_vs_50dma_pct <= Number(max_price_vs_50dma));

        // ── Step 4: Peer rank by market cap
        const sorted = [...enriched].sort((a, b) => (Number(b.market_cap) || 0) - (Number(a.market_cap) || 0));
        const rankMap = new Map(sorted.map((r, i) => [r.company_id, i + 1]));
        enriched = enriched.map(r => ({ ...r, peer_rank: rankMap.get(r.company_id) }));

        // ── Step 5: If user wants to sort by a financial field, sort in JS
        const jsSortFields = ['roe', 'debt_equity', 'net_margin', 'revenue_growth', 'dist_52w_high_pct'];
        if (jsSortFields.includes(safeSort)) {
            enriched.sort((a, b) => {
                const av = a[safeSort] ?? (safeOrder === 'ASC' ? Infinity : -Infinity);
                const bv = b[safeSort] ?? (safeOrder === 'ASC' ? Infinity : -Infinity);
                return safeOrder === 'ASC' ? av - bv : bv - av;
            });
        }

        const [sectors] = await db.query('SELECT DISTINCT sector FROM companies WHERE sector IS NOT NULL ORDER BY sector');

        res.json({
            success: true,
            count: enriched.length,
            data: enriched,
            meta: { sectors: sectors.map(s => s.sector) }
        });

    } catch (err) {
        next(err);
    }
};

module.exports = { runScreener };
