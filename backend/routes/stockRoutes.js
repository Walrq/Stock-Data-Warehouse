const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { addStockData, getStockData } = require('../controllers/stockController');
const validate = require('../middleware/validate');

const stockPriceSchema = Joi.object({
    company_id: Joi.number().required(),
    timestamp: Joi.date().iso().required(),
    span: Joi.string().valid('1min','5min','15min','1hour','1day').required(),
    open_price: Joi.number().allow(null),
    high_price: Joi.number().allow(null),
    low_price: Joi.number().allow(null),
    close_price: Joi.number().allow(null),
    volume: Joi.number().allow(null),
    vwap: Joi.number().allow(null)
});

const stockArraySchema = Joi.object({
    data: Joi.array().items(stockPriceSchema).min(1).required()
});

router.route('/')
    .post(validate(stockArraySchema), addStockData);

router.route('/:company_id')
    .get(getStockData);

module.exports = router;
