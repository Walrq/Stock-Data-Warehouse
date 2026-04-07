const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { fetchNews, fetchHistoricalStats, fetchStockProfile } = require('../controllers/externalController');
const validate = require('../middleware/validate');

const nameSchema = Joi.object({
    name: Joi.string().required(),
    company_id: Joi.number().optional()
});

const companyIdSchema = Joi.object({
    company_id: Joi.number().optional() // Or pass a name if filtering
});

router.route('/news').post(validate(companyIdSchema), fetchNews);
router.route('/historical').post(validate(nameSchema), fetchHistoricalStats);
router.route('/profile').post(validate(nameSchema), fetchStockProfile);

module.exports = router;
