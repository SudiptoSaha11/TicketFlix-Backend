// routes/razorpayRoutes.js
const express = require('express');
const router = express.Router();
const razorpayCtrl = require('../../controllers/Payment/razorpayController');

// Regular JSON endpoints
router.post('/create-order', razorpayCtrl.createOrder);
router.post('/verify-payment', razorpayCtrl.verifyPayment);
router.get('/payment/:paymentId', razorpayCtrl.getPayment);

// NOTE: webhook route is recommended to be registered with raw body parser directly in app.js
// You can still mount a route here, but ensure app uses bodyParser.raw for this path.
router.post('/webhook', razorpayCtrl.webhookHandler);

module.exports = router;
