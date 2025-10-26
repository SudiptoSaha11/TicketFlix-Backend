// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/Payment/paymentController');

router.post('/api/create-checkout-session', paymentController.createCheckoutSession);
router.get('/api/checkout-session/:id', paymentController.getCheckoutSession);
router.post('/api/event/create-checkout-session', paymentController. createventCheckoutSession);

module.exports = router;


module.exports = router;
