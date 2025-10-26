// routes/beverageRoutes.js
const express = require('express');
const router = express.Router();
const beverageController = require('../../controllers/Movie/beverageController');

// Keep the exact same endpoints so frontend doesn't need to change
router.post('/beverages/add', beverageController.createBeverage);
router.get('/beverages', beverageController.getAllBeverages);
router.get('/beverages/:id', beverageController.getBeverageById);
router.put('/beverages/:id', beverageController.updateBeverage);
router.delete('/beverages/:id', beverageController.deleteBeverage);

module.exports = router;
