// Run this script once to create the DB View and Stored Procedure
// Usage: node backend/migrations/run_migration.js
require('dotenv').config();
const db = require('../config/db');

async function runMigration() {
    console.log('Running migration: create views and procedures...\n');

    // ── Create VIEW ──
    console.log('Creating view: vw_screener_base...');
    await db.query(`
        CREATE OR REPLACE VIEW vw_screener_base AS
        SELECT
            c.company_id,
            c.ticker,
            c.company_name,
            c.sector,
            c.industry,
            c.market_cap,
            sp_latest.close_price   AS latest_close,
            sp_latest.open_price    AS latest_open,
            sp_latest.high_price    AS latest_high,
            sp_latest.low_price     AS latest_low,
            sp_latest.volume        AS latest_volume,
            sp_latest.timestamp     AS latest_date,
            sp_prev.close_price     AS prev_close,
            sp_30d.close_price      AS close_30d_ago,
            sp_52w.high_52w,
            sp_52w.low_52w,
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
    `);
    console.log('✅ View created: vw_screener_base\n');

    // ── Drop and recreate PROCEDURE ──
    console.log('Creating procedure: sp_refresh_technicals...');
    await db.query('DROP PROCEDURE IF EXISTS sp_refresh_technicals');

    await db.query(`
        CREATE PROCEDURE sp_refresh_technicals(IN p_company_id INT)
        BEGIN
            DECLARE v_ma50   DECIMAL(15,4);
            DECLARE v_ma200  DECIMAL(15,4);
            DECLARE v_rsi    DECIMAL(10,4);
            DECLARE v_now    DATETIME DEFAULT NOW();

            SELECT AVG(close_price) INTO v_ma50
            FROM (SELECT close_price FROM stock_prices WHERE company_id = p_company_id AND span = '1day' ORDER BY timestamp DESC LIMIT 50) t;

            SELECT AVG(close_price) INTO v_ma200
            FROM (SELECT close_price FROM stock_prices WHERE company_id = p_company_id AND span = '1day' ORDER BY timestamp DESC LIMIT 200) t;

            SELECT 100 - (100 / (1 + (avg_gain / NULLIF(avg_loss, 0)))) INTO v_rsi
            FROM (
                SELECT
                    AVG(CASE WHEN diff > 0 THEN diff  ELSE 0 END) AS avg_gain,
                    AVG(CASE WHEN diff < 0 THEN -diff ELSE 0 END) AS avg_loss
                FROM (
                    SELECT close_price - LAG(close_price) OVER (ORDER BY timestamp) AS diff
                    FROM stock_prices
                    WHERE company_id = p_company_id AND span = '1day'
                    ORDER BY timestamp DESC LIMIT 15
                ) diffs
                WHERE diff IS NOT NULL
            ) rsi_calc;

            INSERT INTO technical_indicators (company_id, ma_50, ma_200, rsi, timestamp)
            VALUES (p_company_id, v_ma50, v_ma200, v_rsi, v_now)
            ON DUPLICATE KEY UPDATE
                ma_50 = v_ma50, ma_200 = v_ma200, rsi = v_rsi, timestamp = v_now;

            SELECT p_company_id AS company_id, v_ma50 AS ma_50, v_ma200 AS ma_200, v_rsi AS rsi, v_now AS computed_at;
        END
    `);
    console.log('✅ Procedure created: sp_refresh_technicals\n');

    // ── Verify ──
    const [views] = await db.query(`SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE()`);
    const [procs] = await db.query(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'`);

    console.log('📋 Active Views:',      views.map(v => v.TABLE_NAME));
    console.log('📋 Active Procedures:', procs.map(p => p.ROUTINE_NAME));
    console.log('\n🎉 Migration complete!');

    process.exit(0);
}

runMigration().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
