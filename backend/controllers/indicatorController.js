const db = require('../config/db');

// @desc    Store indicators
// @route   POST /api/indicators
const addIndicator = async (req, res, next) => {
    try {
        const { company_id, timestamp, span, rsi, macd, ma_50, ma_200, bollinger_upper, bollinger_lower } = req.body;
        
        const [result] = await db.query(
            'INSERT INTO technical_indicators (company_id, timestamp, span, rsi, macd, ma_50, ma_200, bollinger_upper, bollinger_lower) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [company_id, timestamp, span, rsi, macd, ma_50, ma_200, bollinger_upper, bollinger_lower]
        );

        res.status(201).json({ success: true, insertedId: result.insertId });
    } catch (err) {
        next(err);
    }
};

// @desc    Get indicators
// @route   GET /api/indicators/:company_id
const getIndicators = async (req, res, next) => {
    try {
        const { company_id } = req.params;
        const { start_date, end_date, span } = req.query;

        let query = 'SELECT timestamp, span, rsi, macd, ma_50, ma_200, bollinger_upper, bollinger_lower FROM technical_indicators WHERE company_id = ?';
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
    addIndicator,
    getIndicators
};
