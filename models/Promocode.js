const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['flat', 'percent'], // e.g., Rs.50 off or 10% off
    required: true
  },
  amount: {
    type: Number, // for flat discount (if type === 'flat')
    default: 0
  },
  percent: {
    type: Number, // for percent discount (if type === 'percent')
    default: 0
  },
  minAmount: {
    type: Number,
    default: 0 // minimum order amount required to apply
  },
  expiryDate: {
    type: Date,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
