const express = require('express');
const router = express.Router();
const promoController = require('../../controllers/Promocode/promocodeController');

// Admin route
router.post('/create-promo', promoController.createPromoCode);

// Payment page uses this to validate
router.post('/apply', promoController.validatePromoCode);

// Optional
router.get('/active-promos', promoController.listActivePromos);

module.exports = router;
