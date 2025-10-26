const express = require('express');
const router = express.Router();
const { calculateSummary } = require('../../controllers/Movie/Summary');

router.post('/calculate-summary', calculateSummary);

module.exports = router;
