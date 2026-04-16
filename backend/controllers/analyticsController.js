const db = require('../config/db');

// ─────────────────────────────────────────────────────────────────
// FEATURE 1 — Window Functions: Sector Rankings
// Uses RANK() OVER (PARTITION BY sector ORDER BY change_pct DESC)
// ─────────────────────────────────────────────────────────────────
const getSectorRankings = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                company_id,
                ticker,
                company_name,
                sector,
                market_cap,
                latest_close,
                latest_volume,

                -- 1-Day change %
                ROUND(
                    ((latest_close - prev_close) / NULLIF(prev_close, 0)) * 100, 2
                ) AS change_1d_pct,

                -- Window: Rank within sector by 1-day change
                RANK() OVER (
                    PARTITION BY sector
                    ORDER BY ((latest_close - prev_close) / NULLIF(prev_close, 0)) DESC
                ) AS sector_rank_change,

                -- Window: Rank within sector by market cap
                RANK() OVER (
                    PARTITION BY sector
                    ORDER BY market_cap DESC
                ) AS sector_rank_mcap,

                -- Window: Rank within sector by volume
                RANK() OVER (
                    PARTITION BY sector
                    ORDER BY latest_volume DESC
                ) AS sector_rank_volume,

                -- Window: dense rank overall by change
                DENSE_RANK() OVER (
                    ORDER BY ((latest_close - prev_close) / NULLIF(prev_close, 0)) DESC
                ) AS overall_rank

            FROM vw_screener_base
            WHERE sector IS NOT NULL
            ORDER BY sector, sector_rank_change
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────
// FEATURE 2 — LAG() Window Function: Consecutive Streak Detection
// Detects how many consecutive days each stock has been up or down
// ─────────────────────────────────────────────────────────────────
const getStreaks = async (req, res, next) => {
    try {
        // Step 1: Get last 30 days of daily closes per company
        const [priceRows] = await db.query(`
            SELECT
                c.company_id,
                c.ticker,
                c.company_name,
                c.sector,
                sp.close_price,
                sp.timestamp,
                -- LAG: compare today vs yesterday
                LAG(sp.close_price) OVER (
                    PARTITION BY sp.company_id
                    ORDER BY sp.timestamp
                ) AS prev_close,
                -- Direction: +1 up, -1 down, 0 flat
                CASE
                    WHEN sp.close_price > LAG(sp.close_price) OVER (PARTITION BY sp.company_id ORDER BY sp.timestamp) THEN 1
                    WHEN sp.close_price < LAG(sp.close_price) OVER (PARTITION BY sp.company_id ORDER BY sp.timestamp) THEN -1
                    ELSE 0
                END AS direction
            FROM stock_prices sp
            JOIN companies c ON c.company_id = sp.company_id
            WHERE sp.span = '1day'
              AND sp.timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY sp.company_id, sp.timestamp DESC
        `);

        // Step 2: Compute streaks in JS (avoids recursive SQL complexity)
        const companyMap = new Map();

        for (const row of priceRows) {
            if (!companyMap.has(row.company_id)) {
                companyMap.set(row.company_id, {
                    company_id:   row.company_id,
                    ticker:       row.ticker,
                    company_name: row.company_name,
                    sector:       row.sector,
                    latest_close: row.close_price,
                    directions:   []
                });
            }
            if (row.direction !== null && row.prev_close !== null) {
                companyMap.get(row.company_id).directions.push(Number(row.direction));
            }
        }

        const results = [];
        for (const co of companyMap.values()) {
            const dirs = co.directions; // already DESC sorted (most recent first)
            if (dirs.length === 0) continue;

            const latestDir = dirs[0];
            let streak = 0;

            for (const d of dirs) {
                if (latestDir === 0) break;
                if (d === latestDir) streak++;
                else break;
            }

            results.push({
                company_id:   co.company_id,
                ticker:       co.ticker,
                company_name: co.company_name,
                sector:       co.sector,
                latest_close: co.latest_close,
                streak_days:  streak,
                streak_dir:   latestDir === 1 ? 'up' : latestDir === -1 ? 'down' : 'flat'
            });
        }

        // Sort: longest streak first
        results.sort((a, b) => b.streak_days - a.streak_days);

        res.json({ success: true, count: results.length, data: results });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────
// FEATURE 5 — Sector Heatmap
// GROUP BY sector with avg change, best/worst performer per sector
// ─────────────────────────────────────────────────────────────────
const getSectorHeatmap = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT
                sector,
                COUNT(*)                                                       AS company_count,
                ROUND(AVG((latest_close - prev_close) / NULLIF(prev_close,0) * 100), 2) AS avg_change_pct,
                ROUND(MIN((latest_close - prev_close) / NULLIF(prev_close,0) * 100), 2) AS min_change_pct,
                ROUND(MAX((latest_close - prev_close) / NULLIF(prev_close,0) * 100), 2) AS max_change_pct,
                SUM(market_cap)                                                AS total_market_cap,

                -- Best performer ticker in sector
                SUBSTRING_INDEX(
                    GROUP_CONCAT(ticker ORDER BY (latest_close - prev_close) / NULLIF(prev_close,0) DESC SEPARATOR ','),
                    ',', 1
                ) AS best_ticker,

                -- Worst performer ticker in sector
                SUBSTRING_INDEX(
                    GROUP_CONCAT(ticker ORDER BY (latest_close - prev_close) / NULLIF(prev_close,0) ASC SEPARATOR ','),
                    ',', 1
                ) AS worst_ticker

            FROM vw_screener_base
            WHERE sector IS NOT NULL
            GROUP BY sector
            ORDER BY avg_change_pct DESC
        `);

        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────
// FEATURE 4 — Stored Procedure: refresh technicals for one company
// ─────────────────────────────────────────────────────────────────
const refreshTechnicals = async (req, res, next) => {
    try {
        const { company_id } = req.body;
        if (!company_id) {
            return res.status(400).json({ success: false, message: 'company_id is required' });
        }

        // Call the stored procedure
        const [result] = await db.query('CALL sp_refresh_technicals(?)', [Number(company_id)]);
        // MySQL returns the SELECT inside the procedure as result[0][0]
        const computed = result[0]?.[0] || null;

        res.json({ success: true, message: 'Technicals refreshed', data: computed });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────
// META — list DB views and procedures for the info panel
// ─────────────────────────────────────────────────────────────────
const getDbObjects = async (req, res, next) => {
    try {
        const [[views], [procedures]] = await Promise.all([
            db.query(`
                SELECT TABLE_NAME AS name, 'VIEW' AS type
                FROM information_schema.VIEWS
                WHERE TABLE_SCHEMA = DATABASE()
            `),
            db.query(`
                SELECT ROUTINE_NAME AS name, 'PROCEDURE' AS type
                FROM information_schema.ROUTINES
                WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'
            `)
        ]);

        res.json({
            success: true,
            data: { views, procedures }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getSectorRankings,
    getStreaks,
    getSectorHeatmap,
    refreshTechnicals,
    getDbObjects
};
