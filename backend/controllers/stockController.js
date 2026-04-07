const db = require('../config/db');

// @desc    Insert stock data (bulk + single)
// @route   POST /api/stocks
const addStockData = async (req, res, next) => {
    try {
        const { data } = req.body; // Expect an array of data objects
        if (!Array.isArray(data) || data.length === 0) {
            res.status(400);
            return next(new Error('Data must be a non-empty array'));
        }

        const values = data.map(item => [
            item.company_id,
            item.timestamp,
            item.span || '1day',
            item.open_price,
            item.high_price,
            item.low_price,
            item.close_price,
            item.volume,
            item.vwap || null
        ]);

        const [result] = await db.query(
            'INSERT INTO stock_prices (company_id, timestamp, span, open_price, high_price, low_price, close_price, volume, vwap) VALUES ?',
            [values]
        );

        res.status(201).json({ success: true, inserted: result.affectedRows });
    } catch (err) {
        next(err);
    }
};

// @desc    Get historical data (date range filter)
// @route   GET /api/stocks/:company_id
const getStockData = async (req, res, next) => {
    try {
        const { company_id } = req.params;
        const { start_date, end_date, span } = req.query;

        let query = 'SELECT timestamp, span, open_price, high_price, low_price, close_price, volume, vwap FROM stock_prices WHERE company_id = ?';
        let queryParams = [company_id];

        if (span) {
            query += ' AND span = ?';
            queryParams.push(span);
        }
        if (start_date) {
            query += ' AND timestamp >= ?';
            queryParams.push(start_date);
        }
        if (end_date) {
            query += ' AND timestamp <= ?';
            queryParams.push(end_date);
        }

        query += ' ORDER BY timestamp ASC';

        const [rows] = await db.query(query, queryParams);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    addStockData,
    getStockData
};
