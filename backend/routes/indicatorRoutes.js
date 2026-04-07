const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { addIndicator, getIndicators } = require('../controllers/indicatorController');
const validate = require('../middleware/validate');

const indicatorSchema = Joi.object({
    company_id: Joi.number().required(),
    timestamp: Joi.date().iso().required(),
    span: Joi.string().valid('1min','5min','1day').required(),
    rsi: Joi.number().allow(null),
    macd: Joi.number().allow(null),
    ma_50: Joi.number().allow(null),
    ma_200: Joi.number().allow(null),
    bollinger_upper: Joi.number().allow(null),
    bollinger_lower: Joi.number().allow(null)
});

router.route('/')
    .post(validate(indicatorSchema), addIndicator);

router.route('/:company_id')
    .get(getIndicators);

module.exports = router;
