const express = require('express');
const router = express.Router();
const { runScreener } = require('../controllers/screenerController');

router.get('/', runScreener);

module.exports = router;
