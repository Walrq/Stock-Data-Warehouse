const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { addTradeData, getTradeHistory } = require('../controllers/tradeController');
const validate = require('../middleware/validate');

const tradeSchema = Joi.object({
    company_id: Joi.number().required(),
    timestamp: Joi.date().iso().required(),
    price: Joi.number().required(),
    quantity: Joi.number().required()
});

router.route('/')
    .get(getTradeHistory)
    .post(validate(tradeSchema), addTradeData);

module.exports = router;
