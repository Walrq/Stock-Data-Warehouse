const { request } = require('undici');
const db = require('../config/db');

const API_KEY = process.env.INDIAN_API_KEY;
if (!API_KEY) throw new Error('Missing INDIAN_API_KEY in environment variables');
const BASE_URL = 'https://stock.indianapi.in';

async function getFromApi(path) {
    const { statusCode, body } = await request(`${BASE_URL}${path}`, {
        headers: {
            'X-Api-Key': API_KEY
        }
    });

    if (statusCode !== 200) {
        throw new Error(`API error: ${statusCode}`);
    }

    return await body.json();
}

// @desc    Fetch news
const fetchNews = async (req, res, next) => {
    try {
        const { company_id } = req.body;
        const data = await getFromApi('/news'); 

        // Assuming data is an array of news items
        // We handle insertion if it acts like an array
        let inserted = 0;
        if (Array.isArray(data)) {
            for (const item of data) {
                await db.query(
                    'INSERT IGNORE INTO market_news (company_id, headline, source, published_at, sentiment_score) VALUES (?, ?, ?, ?, ?)',
                    [company_id || null, item.title || item.headline || 'No Headline', item.source || 'Unknown', new Date(), item.sentiment || null]
                );
                inserted++;
            }
        }
        res.json({ success: true, message: `Inserted ${inserted} news items.`, data });
    } catch (err) {
        next(err);
    }
};

// @desc    Fetch historical stats
const fetchHistoricalStats = async (req, res, next) => {
    try {
        const { name, company_id } = req.body;
        const data = await getFromApi(`/historical_data?stock_name=${encodeURIComponent(name)}&period=1yr&filter=default`);

        if (data && data.datasets) {
            let pricesMap = {};
            let indicatorsMap = {};

            for (const dataset of data.datasets) {
                const metric = dataset.metric;
                for (const row of dataset.values) {
                    const date = row[0] + ' 00:00:00';
                    const val = parseFloat(row[1]) || 0;

                    if (metric === 'Price') {
                        if (!pricesMap[date]) pricesMap[date] = { close: val };
                        else pricesMap[date].close = val;
                    } else if (metric === 'Volume') {
                        if (!pricesMap[date]) pricesMap[date] = { volume: val };
                        else pricesMap[date].volume = val;
                    } else if (metric === 'DMA50' || metric === 'DMA200') {
                        if (!indicatorsMap[date]) indicatorsMap[date] = {};
                        if (metric === 'DMA50') indicatorsMap[date].ma_50 = val;
                        if (metric === 'DMA200') indicatorsMap[date].ma_200 = val;
                    }
                }
            }

            // Insert prices
            const pricesArr = [];
            for (const [date, values] of Object.entries(pricesMap)) {
                pricesArr.push([
                    company_id,
                    date,
                    '1day', // span
                    values.close || 0, // mock open
                    values.close || 0, // mock high
                    values.close || 0, // mock low
                    values.close || 0, // close
                    values.volume || 0 // volume
                ]);
            }

            if (pricesArr.length > 0) {
                await db.query(
                    'INSERT IGNORE INTO stock_prices (company_id, timestamp, span, open_price, high_price, low_price, close_price, volume) VALUES ?',
                    [pricesArr]
                );
            }

            // Insert indicators
            const indArr = [];
            for (const [date, values] of Object.entries(indicatorsMap)) {
                indArr.push([
                    company_id,
                    date,
                    '1day',
                    values.ma_50 || null,
                    values.ma_200 || null
                ]);
            }

            if (indArr.length > 0) {
                await db.query(
                    'INSERT IGNORE INTO technical_indicators (company_id, timestamp, span, ma_50, ma_200) VALUES ?',
                    [indArr]
                );
            }

            res.json({ success: true, message: `Processed ${pricesArr.length} price records and ${indArr.length} indicators` });
        } else {
            res.status(400).json({ success: false, message: 'Invalid format received' });
        }
    } catch (err) {
        next(err);
    }
};

// @desc    Fetch stock profile
const fetchStockProfile = async (req, res, next) => {
    try {
        const { name, company_id } = req.body;
        // User implied URL from the prompt response structure for details. Example inferred URL:
        const data = await getFromApi(`/stock?name=${encodeURIComponent(name)}`);

        if (data && data.companyName) {
            // Update company record if company_id is provided
            if (company_id) {
                await db.query(
                    `UPDATE companies 
                     SET company_name = ?, industry = ?, market_cap = ?
                     WHERE company_id = ?`,
                    [data.companyName, data.industry || null, data.keyMetrics?.marketCap || null, company_id]
                );
            }

            res.json({ success: true, data });
        } else {
            res.status(400).json({ success: false, message: 'Profile data not found in response', raw: data });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    fetchNews,
    fetchHistoricalStats,
    fetchStockProfile
};
