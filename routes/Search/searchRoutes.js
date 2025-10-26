// routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../../controllers/Search/searchController');

// Keep the same API endpoints
router.get('/api/autocomplete', searchController.movieAutocomplete);
router.get('/api/eventcomplete', searchController.eventAutocomplete);

module.exports = router;
