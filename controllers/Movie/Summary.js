const Promo = require('../../models/Promocode'); // Adjust path as needed

const CONVENIENCE_FEE_PER_TICKET = 40;
const IGST_RATE = 0.18;

exports.calculateSummary = async (req, res) => {
  try {
    const { seats = [], food = [], promoCode } = req.body;

    if (!Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'Seats are required' });
    }

    const subtotal = seats.reduce((sum, seat) => sum + (seat.price || 0), 0);
    const foodTotal = food.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    const baseConvenienceFee = seats.length * CONVENIENCE_FEE_PER_TICKET;
    const convenienceTax = baseConvenienceFee * IGST_RATE;
    const totalConvenienceFee = baseConvenienceFee + convenienceTax;

    let promoDiscount = 0;
    let appliedPromo = null;

    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode.toUpperCase() });

      if (promo) {
        const now = new Date();
        if (promo.expiryDate && promo.expiryDate < now) {
          return res.status(400).json({ error: 'Promo code expired' });
        }

        if ((subtotal + foodTotal) >= (promo.minAmount || 0)) {
          if (promo.type === 'percent' && promo.percent) {
            promoDiscount = ((subtotal + foodTotal) * promo.percent) / 100;
          } else if (promo.type === 'flat' && promo.flat) {
            promoDiscount = promo.flat;
          }
          appliedPromo = promo.code;
        } else {
          return res.status(400).json({ error: `Minimum amount for promo is ₹${promo.minAmount}` });
        }
      } else {
        return res.status(400).json({ error: 'Invalid promo code' });
      }
    }

    const finalPayable = subtotal + foodTotal + totalConvenienceFee - promoDiscount;

    res.json({
      subtotal,
      foodTotal,
      convenienceFee: {
        baseFee: baseConvenienceFee,
        tax: convenienceTax,
        total: totalConvenienceFee,
      },
      promoDiscount,
      finalPayable,
      appliedPromo,
    });
  } catch (error) {
    console.error('Error calculating summary:', error);
    res.status(500).json({ error: 'Server error calculating summary' });
  }
};
