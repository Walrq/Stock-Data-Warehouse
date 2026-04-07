const db = require('../config/db');

// @desc    Get all companies
// @route   GET /api/companies
const getCompanies = async (req, res, next) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM companies';
        let queryParams = [];

        if (search) {
            query += ' WHERE company_name LIKE ? OR ticker LIKE ?';
            const wildcard = `%${search}%`;
            queryParams.push(wildcard, wildcard);
        }

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
