const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { getCompanies, getCompany, addCompany } = require('../controllers/companyController');
const validate = require('../middleware/validate');

const companySchema = Joi.object({
    company_name: Joi.string().required(),
    ticker: Joi.string().required().uppercase(),
    sector: Joi.string().allow('', null),
    industry: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    exchange_id: Joi.number().allow(null),
    ipo_date: Joi.date().allow(null),
    market_cap: Joi.number().allow(null)
});

router.route('/')
    .get(getCompanies)
    .post(validate(companySchema), addCompany);

router.route('/:ticker')
    .get(getCompany);

module.exports = router;
