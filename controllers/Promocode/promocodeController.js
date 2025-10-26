const PromoCode = require('../../models/Promocode');

// Create promo code (admin use only)
const createPromoCode = async (req, res) => {
  try {
    const { code, type, amount, percent, minAmount, expiryDate } = req.body;

    if (!code || !type || !expiryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ error: 'Promo code already exists' });
    }

    const newPromo = new PromoCode({
      code,
      type,
      amount,
      percent,
      minAmount,
      expiryDate
    });

    await newPromo.save();
    res.status(201).json({ message: 'Promo code created', promo: newPromo });

  } catch (err) {
    console.error('Create promo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const validatePromoCode = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const orderSubtotal = Number(req.body.orderTotal); // treat as subtotal

    console.log('[server] promo request:', { code, orderSubtotal });

    if (!code || !Number.isFinite(orderSubtotal)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const promo = await PromoCode.findOne({ code, active: true });
    if (!promo) return res.status(404).json({ error: 'Promo code not found or inactive' });
    if (new Date() > promo.expiryDate) return res.status(400).json({ error: 'Promo code expired' });
    if (orderSubtotal < promo.minAmount) {
      return res.status(400).json({ error: `Minimum order value is Rs. ${promo.minAmount}` });
    }

    let discount = 0;
    if (promo.type === 'flat') discount = promo.amount;
    else if (promo.type === 'percent') discount = (orderSubtotal * promo.percent) / 100;

    const discountAmount = Math.floor(discount);

    return res.json({
      valid: true,
      discount: discountAmount, // backend returns just discount
      message: 'Promo code applied successfully',
    });
  } catch (err) {
    console.error('Validate promo error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Optional: list active promos
const listActivePromos = async (req, res) => {
  try {
    const promos = await PromoCode.find({ active: true, expiryDate: { $gte: new Date() } });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch promo codes' });
  }
};

module.exports = {
  createPromoCode,
  validatePromoCode,
  listActivePromos
};
