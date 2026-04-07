const db = require('../config/db');

// @desc    Insert trade data
// @route   POST /api/trades
const addTradeData = async (req, res, next) => {
    try {
        const { company_id, timestamp, price, quantity } = req.body;
        
        const [result] = await db.query(
            'INSERT INTO trades (company_id, timestamp, price, quantity) VALUES (?, ?, ?, ?)',
            [company_id, timestamp, price, quantity]
        );

        res.status(201).json({ success: true, insertedId: result.insertId });
    } catch (err) {
        next(err);
    }
};

// @desc    Get trade history
// @route   GET /api/trades
const getTradeHistory = async (req, res, next) => {
    try {
        const { company_id, start_date, end_date, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT t.trade_id, t.company_id, c.ticker, c.company_name, t.timestamp, t.price, t.quantity 
            FROM trades t
            JOIN companies c ON t.company_id = c.company_id
            WHERE 1=1
        `;
        let queryParams = [];

        if (company_id) {
            query += ' AND t.company_id = ?';
            queryParams.push(company_id);
        }
        if (start_date) {
            query += ' AND t.timestamp >= ?';
            queryParams.push(start_date);
        }
        if (end_date) {
            query += ' AND t.timestamp <= ?';
            queryParams.push(end_date);
        }

        query += ' ORDER BY t.timestamp DESC LIMIT ? OFFSET ?';
        // Needs cast for limits in mysql2 sometimes, but we pass numbers
        queryParams.push(Number(limit), Number(offset));

        const [rows] = await db.query(query, queryParams);
        
        // Let's also get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM trades t WHERE 1=1';
        let countParams = [];
        if (company_id) {
            countQuery += ' AND t.company_id = ?';
            countParams.push(company_id);
        }
        if (start_date) {
            countQuery += ' AND t.timestamp >= ?';
            countParams.push(start_date);
        }
        if (end_date) {
            countQuery += ' AND t.timestamp <= ?';
            countParams.push(end_date);
        }
        const [countRow] = await db.query(countQuery, countParams);
        
        res.json({ 
            success: true, 
            count: rows.length, 
            total: countRow[0].total,
            data: rows 
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    addTradeData,
    getTradeHistory
};
