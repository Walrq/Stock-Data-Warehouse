require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const db = require('./config/db');

// Import routes
const companyRoutes = require('./routes/companyRoutes');
const stockRoutes = require('./routes/stockRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const indicatorRoutes = require('./routes/indicatorRoutes');
const externalRoutes = require('./routes/externalRoutes');
const screenerRoutes = require('./routes/screenerRoutes'); // [SCREENER FEATURE]
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logger

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/indicators', indicatorRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/screener',  screenerRoutes);  // [SCREENER FEATURE]
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        // Test database connection on startup
        const connection = await db.getConnection();
        console.log('Database connected successfully!');
        connection.release();
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
    }
});
