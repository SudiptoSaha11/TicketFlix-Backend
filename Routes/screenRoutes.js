// routes/screenRoutes.js
const express = require('express');
const router = express.Router();
const Screen = require('../models/screen'); // Adjust the path as necessary

// Endpoint to get total number of seats for a specific screen
router.get('/api/screen/:screenNumber/seats', async (req, res) => {
    try {
        const screen = await Screen.findOne({ ScreenNumber: req.params.screenNumber });
        if (!screen) return res.status(404).json({ error: 'Screen not found' });

        const totalSeats = screen.GoldSeat + screen.SilverSeat + screen.PlatinumSeat;
        res.json({ totalSeats });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
