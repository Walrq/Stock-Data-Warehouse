-- ============================================================
-- Stock Data Warehouse — Advanced SQL Feature Migration
-- Run this once in MySQL Workbench or mysql CLI:
--   mysql -u root -p stock_warehouse < migrations/create_views_and_procedures.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- FEATURE 3: DATABASE VIEW
-- vw_screener_base pre-joins the 4 most expensive
-- JOIN chains so every controller can reuse it.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_screener_base AS
SELECT
    c.company_id,
    c.ticker,
    c.company_name,
    c.sector,
    c.industry,
    c.market_cap,

    -- Latest trading day
    sp_latest.close_price   AS latest_close,
    sp_latest.open_price    AS latest_open,
    sp_latest.high_price    AS latest_high,
    sp_latest.low_price     AS latest_low,
    sp_latest.volume        AS latest_volume,
    sp_latest.timestamp     AS latest_date,

    -- Previous day close (for 1-day change)
    sp_prev.close_price     AS prev_close,

    -- 30-day-ago close
    sp_30d.close_price      AS close_30d_ago,

    -- 52-week high/low
    sp_52w.high_52w,
    sp_52w.low_52w,

    -- 30-day avg volume
    sp_avg.avg_volume_30d,

    -- Latest technical indicators
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
);


-- ─────────────────────────────────────────────
-- FEATURE 4: STORED PROCEDURE
-- sp_refresh_technicals recalculates MA50, MA200,
-- and RSI from raw stock_prices and upserts the result.
-- Usage: CALL sp_refresh_technicals(1);
-- ─────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_refresh_technicals;

DELIMITER $$

CREATE PROCEDURE sp_refresh_technicals(IN p_company_id INT)
BEGIN
    DECLARE v_ma50   DECIMAL(15,4);
    DECLARE v_ma200  DECIMAL(15,4);
    DECLARE v_rsi    DECIMAL(10,4);
    DECLARE v_now    DATETIME DEFAULT NOW();

    -- MA50: average of last 50 daily closes
    SELECT AVG(close_price) INTO v_ma50
    FROM (
        SELECT close_price FROM stock_prices
        WHERE company_id = p_company_id AND span = '1day'
        ORDER BY timestamp DESC LIMIT 50
    ) t;

    -- MA200: average of last 200 daily closes
    SELECT AVG(close_price) INTO v_ma200
    FROM (
        SELECT close_price FROM stock_prices
        WHERE company_id = p_company_id AND span = '1day'
        ORDER BY timestamp DESC LIMIT 200
    ) t;

    -- RSI-14: simplified Wilder's RSI
    -- Gain = avg positive day-over-day change over 14 days
    -- Loss = avg negative day-over-day change over 14 days
    SELECT
        100 - (100 / (1 + (avg_gain / NULLIF(avg_loss, 0))))
    INTO v_rsi
    FROM (
        SELECT
            AVG(CASE WHEN diff > 0 THEN diff  ELSE 0 END) AS avg_gain,
            AVG(CASE WHEN diff < 0 THEN -diff ELSE 0 END) AS avg_loss
        FROM (
            SELECT
                close_price - LAG(close_price) OVER (ORDER BY timestamp) AS diff
            FROM stock_prices
            WHERE company_id = p_company_id AND span = '1day'
            ORDER BY timestamp DESC
            LIMIT 15
        ) diffs
        WHERE diff IS NOT NULL
    ) rsi_calc;

    -- UPSERT into technical_indicators
    INSERT INTO technical_indicators (company_id, ma_50, ma_200, rsi, timestamp)
    VALUES (p_company_id, v_ma50, v_ma200, v_rsi, v_now)
    ON DUPLICATE KEY UPDATE
        ma_50     = v_ma50,
        ma_200    = v_ma200,
        rsi       = v_rsi,
        timestamp = v_now;

    -- Return the computed values
    SELECT
        p_company_id AS company_id,
        v_ma50       AS ma_50,
        v_ma200      AS ma_200,
        v_rsi        AS rsi,
        v_now        AS computed_at;
END $$

DELIMITER ;
