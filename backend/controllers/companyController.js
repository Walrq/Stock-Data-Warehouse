const db = require('../config/db');

// @desc    Get all companies (with latest price & 1D% from stock_prices)
// @route   GET /api/companies
const getCompanies = async (req, res, next) => {
    try {
        const { search } = req.query;

        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE c.company_name LIKE ? OR c.ticker LIKE ?';
            const wildcard = `%${search}%`;
            queryParams.push(wildcard, wildcard);
        }

        const query = `
            SELECT
                c.company_id, c.ticker, c.company_name, c.sector, c.industry, c.country, c.exchange_id, c.ipo_date, c.market_cap,
                sp_latest.close_price  AS latest_close,
                sp_prev.close_price    AS prev_close,
                CASE
                    WHEN sp_prev.close_price IS NOT NULL AND sp_prev.close_price != 0
                    THEN ROUND((sp_latest.close_price - sp_prev.close_price) / sp_prev.close_price * 100, 2)
                    ELSE NULL
                END AS change_1d_pct
            FROM companies c
            -- Latest daily close
            LEFT JOIN stock_prices sp_latest
                ON sp_latest.price_id = (
                    SELECT price_id FROM stock_prices
                    WHERE company_id = c.company_id AND span = '1day'
                    ORDER BY timestamp DESC LIMIT 1
                )
            -- Previous day close
            LEFT JOIN stock_prices sp_prev
                ON sp_prev.price_id = (
                    SELECT price_id FROM stock_prices
                    WHERE company_id = c.company_id AND span = '1day'
                    ORDER BY timestamp DESC LIMIT 1 OFFSET 1
                )
            ${whereClause}
            ORDER BY c.company_name
        `;

        const [rows] = await db.query(query, queryParams);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single company
// @route   GET /api/companies/:ticker
const getCompany = async (req, res, next) => {
    try {
        const { ticker } = req.params;
        const [rows] = await db.query('SELECT * FROM companies WHERE ticker = ?', [ticker]);
        
        if (rows.length === 0) {
            res.status(404);
            return next(new Error(`Company not found with ticker of ${ticker}`));
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// @desc    Add new company
// @route   POST /api/companies
const addCompany = async (req, res, next) => {
    try {
        const { ticker, company_name, sector, industry, country, exchange_id, ipo_date, market_cap } = req.body;
        
        // Check if exists
        const [existing] = await db.query('SELECT * FROM companies WHERE ticker = ?', [ticker]);
        if (existing.length > 0) {
            res.status(400);
            return next(new Error('Company with this ticker already exists'));
        }

        const [result] = await db.query(
            'INSERT INTO companies (ticker, company_name, sector, industry, country, exchange_id, ipo_date, market_cap) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [ticker, company_name, sector, industry, country, exchange_id, ipo_date, market_cap]
        );
        res.status(201).json({ success: true, data: { company_id: result.insertId, ticker, company_name, sector, industry, country, exchange_id, ipo_date, market_cap } });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCompanies,
    getCompany,
    addCompany
};
