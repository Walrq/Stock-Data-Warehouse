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
            signal, // golden_cross | death_cross | near_52w_high | near_52w_low | volume_spike | price_above_ma50 | price_below_ma50 | price_above_ma200
            sort_by = 'company_name',
            sort_order = 'ASC'
        } = req.query;

        // Whitelist sort columns to prevent SQL injection
        const allowedSorts = ['company_name', 'ticker', 'latest_close', 'latest_volume', 'change_1d_pct', 'change_30d_pct', 'market_cap', 'ma_50', 'ma_200'];
        const safeSort = allowedSorts.includes(sort_by) ? sort_by : 'company_name';
        const safeOrder = sort_order === 'DESC' ? 'DESC' : 'ASC';

        // Base query: get latest price, volume, 52w high/low, 30-day change, avg volume, and latest indicators per company
        let query = `
            SELECT 
                c.company_id,
                c.ticker,
                c.company_name,
                c.sector,
                c.market_cap,

                -- Latest trading day stats
                sp_latest.close_price        AS latest_close,
                sp_latest.volume             AS latest_volume,
                sp_latest.timestamp          AS latest_date,

                -- 1-Day price change %
                ROUND(
                    ((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price) * 100, 2
                ) AS change_1d_pct,

                -- 30-Day price change %
                ROUND(
                    ((sp_latest.close_price - sp_30d.close_price) / sp_30d.close_price) * 100, 2
                ) AS change_30d_pct,

                -- 52-week high and low
                sp_52w.high_52w,
                sp_52w.low_52w,

                -- 30-day average volume
                sp_avg.avg_volume_30d,

                -- Latest technical indicators
                ti.ma_50,
                ti.ma_200,
                ti.rsi

            FROM companies c

            -- Latest price row per company
            JOIN stock_prices sp_latest ON sp_latest.price_id = (
                SELECT price_id FROM stock_prices 
                WHERE company_id = c.company_id AND span = '1day'
                ORDER BY timestamp DESC LIMIT 1
            )

            -- Previous day price row per company
            LEFT JOIN stock_prices sp_prev ON sp_prev.price_id = (
                SELECT price_id FROM stock_prices 
                WHERE company_id = c.company_id AND span = '1day'
                ORDER BY timestamp DESC LIMIT 1 OFFSET 1
            )

            -- Price ~30 days ago
            LEFT JOIN stock_prices sp_30d ON sp_30d.price_id = (
                SELECT price_id FROM stock_prices 
                WHERE company_id = c.company_id AND span = '1day'
                ORDER BY timestamp DESC LIMIT 1 OFFSET 29
            )

            -- 52-week high/low
            LEFT JOIN (
                SELECT company_id, MAX(high_price) AS high_52w, MIN(low_price) AS low_52w
                FROM stock_prices
                WHERE span = '1day' AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
                GROUP BY company_id
            ) sp_52w ON sp_52w.company_id = c.company_id

            -- 30-day average volume
            LEFT JOIN (
                SELECT company_id, AVG(volume) AS avg_volume_30d
                FROM stock_prices
                WHERE span = '1day' AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY company_id
            ) sp_avg ON sp_avg.company_id = c.company_id

            -- Latest technical indicators
            LEFT JOIN technical_indicators ti ON ti.indicator_id = (
                SELECT indicator_id FROM technical_indicators
                WHERE company_id = c.company_id
                ORDER BY timestamp DESC LIMIT 1
            )

            WHERE 1=1
        `;

        const params = [];

        // --- Price filters ---
        if (min_price) { query += ' AND sp_latest.close_price >= ?'; params.push(Number(min_price)); }
        if (max_price) { query += ' AND sp_latest.close_price <= ?'; params.push(Number(max_price)); }

        // --- Volume filters ---
        if (min_volume) { query += ' AND sp_latest.volume >= ?'; params.push(Number(min_volume)); }
        if (max_volume) { query += ' AND sp_latest.volume <= ?'; params.push(Number(max_volume)); }

        // --- 1-Day % change ---
        if (min_change_1d) {
            query += ' AND ((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price) * 100 >= ?';
            params.push(Number(min_change_1d));
        }
        if (max_change_1d) {
            query += ' AND ((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price) * 100 <= ?';
            params.push(Number(max_change_1d));
        }

        // --- 30-Day % change ---
        if (min_change_30d) {
            query += ' AND ((sp_latest.close_price - sp_30d.close_price) / sp_30d.close_price) * 100 >= ?';
            params.push(Number(min_change_30d));
        }

        // --- Sector filter ---
        if (sector) { query += ' AND c.sector = ?'; params.push(sector); }

        // --- Market cap filters ---
        if (min_market_cap) { query += ' AND c.market_cap >= ?'; params.push(Number(min_market_cap)); }
        if (max_market_cap) { query += ' AND c.market_cap <= ?'; params.push(Number(max_market_cap)); }

        // --- Technical Signals ---
        if (signal) {
            switch (signal) {
                case 'price_above_ma50':
                    query += ' AND sp_latest.close_price > ti.ma_50';
                    break;
                case 'price_below_ma50':
                    query += ' AND sp_latest.close_price < ti.ma_50';
                    break;
                case 'price_above_ma200':
                    query += ' AND sp_latest.close_price > ti.ma_200';
                    break;
                case 'golden_cross':
                    query += ' AND ti.ma_50 > ti.ma_200';
                    break;
                case 'death_cross':
                    query += ' AND ti.ma_50 < ti.ma_200';
                    break;
                case 'near_52w_high':
                    // Price within 5% of 52-week high
                    query += ' AND sp_latest.close_price >= sp_52w.high_52w * 0.95';
                    break;
                case 'near_52w_low':
                    // Price within 5% of 52-week low
                    query += ' AND sp_latest.close_price <= sp_52w.low_52w * 1.05';
                    break;
                case 'volume_spike':
                    // Today's volume > 2x 30-day average
                    query += ' AND sp_latest.volume > sp_avg.avg_volume_30d * 2';
                    break;
            }
        }

        query += ` ORDER BY ${safeSort} ${safeOrder}`;

        const [rows] = await db.query(query, params);

        // Get distinct sectors for the filter dropdown
        const [sectors] = await db.query('SELECT DISTINCT sector FROM companies WHERE sector IS NOT NULL ORDER BY sector');

        res.json({
            success: true,
            count: rows.length,
            data: rows,
            meta: {
                sectors: sectors.map(s => s.sector)
            }
        });

    } catch (err) {
        next(err);
    }
};

module.exports = { runScreener };
