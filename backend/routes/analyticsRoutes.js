const express = require('express');
const router = express.Router();
const {
    getSectorRankings,
    getStreaks,
    getSectorHeatmap,
    refreshTechnicals,
    getDbObjects
} = require('../controllers/analyticsController');

router.get('/sector-rankings',  getSectorRankings);
router.get('/streaks',          getStreaks);
router.get('/sector-heatmap',   getSectorHeatmap);
router.get('/db-objects',       getDbObjects);
router.post('/refresh-technicals', refreshTechnicals);

module.exports = router;
