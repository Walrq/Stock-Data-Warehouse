const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Default error status
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Sequelize/MySQL error check mapping can be added here
    if (err.code && err.code.startsWith('ER_')) {
        statusCode = 400; // Bad Request for db errors generally
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;
