// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/Dashboard/dashboardController');

// Keep same API endpoint: /dashboard/stats
router.get('/dashboard/stats', dashboardController.getDashboardStats);

module.exports = router;
